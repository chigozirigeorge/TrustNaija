// ============================================================
// USSD session state machine
//
// TrustNaija USSD flow: *234*2#
//
// Menu Structure:
//   Welcome to TrustNaija
//   1. Check a number/account
//   2. Report a scammer
//   3. About TrustNaija
//
// Check flow (*234*2*PHONENUMBER# or via menu):
//   → Immediate risk result on handset
//   → Optional SMS follow-up for full details
//
// Report flow (via menu):
//   → Enter number to report
//   → Select scam type
//   → Confirm
// ============================================================

use redis::{aio::ConnectionManager, AsyncCommands};
use sqlx::PgPool;

use crate::error::AppResult;
use crate::models::ussd::{UssdRequest, UssdResponse, UssdStep, USSD_SCAM_TYPES};
use crate::services::lookup_service::LookupService;
use crate::services::report_service::ReportService;
use crate::utils::hash::hash_identifier;
use crate::utils::normalize::normalize_phone;

/// Redis TTL for USSD sessions (5 minutes — operator timeout window)
const USSD_SESSION_TTL: u64 = 300;

pub struct UssdService;

impl UssdService {
    /// Helpers
    /// Show the TrsutNaija USSD main menu
    fn show_main_menu() -> UssdResponse {
        UssdResponse::cont(
            "Welcome to TrustNaija\nNigeria's Fraud Intelligence\n\n
            1. Check a number/account\n\
            2. Report a scammer\n\
            3. About TrustNaija",
        )
    }

    /// Prompt the user to enter an identifier for lookup
    fn prompt_enter_identifier() -> UssdResponse {
        UssdResponse::cont(
            "Enter the phone number, account number, or URL to check: \n\
            (e.g. 08012345678 or paystack.com/link)",
        )
    }

    /// Prompt user to enter an identifier to report
    fn prompt_report_identifier() -> UssdResponse {
        UssdResponse::cont("Enter the phone/account number of the scammer:")
    }

    /// Show scam type selection menu
    fn show_scam_type_menu() -> UssdResponse {
        UssdResponse::cont(
            "Select scam type:\n\
             1. Romance scam\n\
             2. Investment/Ponzi\n\
             3. Phishing\n\
             4. Impersonation\n\
             5. Online shopping\n\
             6. Other",
        )
    }

    /// Perform identifier lookup and return truncated risk result for handset.
    async fn perform_lookup(
        db: &PgPool,
        redis: &mut ConnectionManager,
        identifier: &str,
        phone_hash: &str,
        _caller_phone: &str,
        high_threshold: u8,
        medium_threshold: u8,
        _session_id: &str,
    ) -> AppResult<UssdResponse> {
        let result = LookupService::lookup(
            db,
            redis,
            identifier,
            None,
            Some(phone_hash.into()),
            "ussd",
            None,
            high_threshold,
            medium_threshold,
        )
        .await?;

        // USSD screens are limited to ~182 chars — keep it tight
        let risk_label = match result.risk_score {
            90..=i16::MAX => "CRITICAL ⚠️",
            70..=89 => "HIGH RISK ⚠️",
            40..=69 => "MEDIUM RISK",
            _ => if result.is_known { "LOW RISK" } else { "NOT REPORTED" },
        };

        let report_count_text = if result.report_count > 0 {
            format!("{} report(s)", result.report_count)
        } else {
            "No reports".into()
        };

        let msg = format!(
            "TrustNaija Result:\n{}\nRisk: {} ({}/100)\nReports: {}\n\nGet SMS alert?\n1. Yes\n2. No",
            &identifier[..identifier.len().min(25)],
            risk_label,
            result.risk_score,
            report_count_text
        );

        Ok(UssdResponse::cont(msg))
    }

    /// Queue an SMS follow-up after USSD lookup
    async fn send_sms_followup(
        _db: &PgPool,
        redis: &mut ConnectionManager,
        identifier: &str,
        caller_phone: &str,
        _high_threshold: u8,
        _medium_threshold: u8,
    ) -> AppResult<UssdResponse> {
        // We can't call full sms_service here without app state,
        // so we queue this in Redis for a background worker to process.
        let queue_key = "queue:sms_alerts";
        let payload = serde_json::to_string(&serde_json::json!({
            "phone": caller_phone,
            "identifier": identifier,
            "queued_at": chrono::Utc::now().to_rfc3339(),
        }))
        .unwrap_or_default();

        let _ = redis.rpush::<_, _, ()>(queue_key, payload).await;

        Ok(UssdResponse::end(
            "Alert SMS will be sent to your number shortly. Thank you for using TrustNaija!"
        ))
    }

    // Submit a quick report from USSD session
    async fn submit_ussd_report(
        db: &PgPool,
        identifier: &str,
        scam_choice: &str,
        _phone_hash: &str,
        caller_phone: &str,
    ) -> AppResult<UssdResponse> {
        // Map USSD menu choice to scam type
        let scam_type = USSD_SCAM_TYPES
            .iter()
            .find(|(num, _)| *num == scam_choice)
            .map(|(_, t)| *t)
            .unwrap_or("other");

        let req = crate::models::reports::CreateReportRequest {
            identifer: identifier.into(),
            identifier_type: String::new(), // Auto-detect
            scam_type: scam_type.into(),
            description: Some("Reported via USSD".into()),
            amount_lost_ngn: None,
            reporter_phone: Some(caller_phone.into()),
            bank_name: None,
            company_website: None,
        };

        match ReportService::create_report(
            db,
            &req,
            None,        // No user account for USSD
            false,       // Not a trusted reporter
            "ussd",
            None,
        )
        .await
        {
            Ok(_) => Ok(UssdResponse::end(
                "Report received! Thank you for helping protect Nigerians from fraud. TrustNaija."
            )),
            Err(e) => {
                tracing::error!("USSD report submission failed: {:?}", e);
                Ok(UssdResponse::end(
                    "Unable to submit report at this time. Please try again or visit trustnaija.ng"
                ))
            }
        }
    }

    /// Main USSD request handler.
    ///
    /// Parses the `text` field (cumulative inputs separated by `*`)
    /// to determine which menu step the user is on, then routes
    /// to the appropriate handler.
    ///
    /// Returns a UssdResponse with CON (continue) or END (terminate).
    pub async fn handle(
        db: &PgPool,
        redis: &mut ConnectionManager,
        req: UssdRequest,
        high_threshold: u8,
        medium_threshold: u8,
    ) -> AppResult<UssdResponse> {
        // Hash the caller's phone for privacy
        let phone_hash = normalize_phone(&req.phone_number)
            .map(|p| hash_identifier(&p))
            .unwrap_or_else(|| hash_identifier(&req.phone_number));

        // Load or initialize session from redis
        let session_key = format!("ussd_session:{}", req.session_id);
        let inputs: Vec<&str> = req.text.split('*').collect();

        // Check if this is a direct shortcut: *234*2*IDENTIFIER#
        // In this case text = "IDENTIFIER" (after the service code is stripped)
        // Gateway delivers only the user-typed portion in `text`.
        let response = match inputs.as_slice() {
            // Empty text = fresh session, show main menu
            [] | [""] => Self::show_main_menu(),

            // User pressed 1 then entered = check a number
            ["1"] => Self::prompt_enter_identifier(),

            // User pressed 1 then entered an identifier
            ["1", identifier] => {
                Self::perform_lookup(
                    db, redis, identifier,
                    &phone_hash, &req.phone_number,
                    high_threshold, medium_threshold,
                    &req.session_id,
                )
                .await?
            }

            // After lookup, user opts for SMS follow-up
            ["1", identifier, "1"] => {
                Self::send_sms_followup(
                    db, redis, identifier,
                    &req.phone_number,
                    high_threshold, medium_threshold,
                )
                .await?
            }

            // After lookup, user declines SMS
            ["1", _, "2"] => UssdResponse::end("Thank you for using TrustNaija. Stay safe!"),

            // User pressed 2 = Report a scammer
            ["2"] => Self::prompt_report_identifier(),

            // User entered identifier to report
            ["2", _identifier] => Self::show_scam_type_menu(),

            // User selected scam type for report
            ["2", identifier, scam_choice] => {
                Self::submit_ussd_report(
                    db, identifier, scam_choice,
                    &phone_hash, &req.phone_number,
                )
                .await?
            }

            // User pressed 3 = About
            ["3"] => UssdResponse::end(
                "TrustNaija: Nigeria's fraud intelligence platform.\nDial *234*2# to check any number, URL or account.\nVisit trustnaija.ng for more."
            ),

            // Unrecognized input
            _ => UssdResponse::end("Invalid selection. Please dial *234*2# and try again."),
        };

        // Record USSD session in Redis for audit and rate-limiting
        let _ = redis
            .set_ex::<_, _, ()>(
                &session_key,
                serde_json::to_string(&serde_json::json!({
                    "phone_hash": phone_hash,
                    "text": req.text,
                    "step": inputs.len()
                }))
                .unwrap_or_default(),
                USSD_SESSION_TTL,
            )
            .await;

        Ok(response)
        }
    }
