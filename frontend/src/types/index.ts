// ─────────────────────────────────────────────────────────────
// Global TypeScript types for TrustNaija frontend
// ─────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface LookupResult {
  identifier: string
  identifier_type: 'phone' | 'url' | 'wallet' | 'app'
  risk_score: number
  risk_level: RiskLevel
  report_count: number
  first_seen_at: string | null
  last_seen_at: string | null
  tags: string[]
  is_known: boolean
}

export interface ReportFormData {
  identifier: string
  identifier_type: string
  scam_type: string
  description?: string
  amount_lost_ngn?: number
  reporter_phone?: string
}

export interface ReportResponse {
  report_id: string
  message: string
  risk_score: number
  status: 'pending' | 'approved'
}

export interface AdminReport {
  id: string
  identifier_id: string
  identifier?: string              // The actual identifier (phone, URL, etc.)
  identifier_type?: string         // Type: phone | url | wallet | app
  scam_type: string
  description?: string
  amount_lost_ngn?: number
  channel: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  risk_score: number
}

export interface AuditLog {
  id: string
  actor_id?: string
  actor_hash?: string
  action: string
  resource_type?: string
  resource_id?: string
  entity_type?: string  // For compatibility
  entity_id?: string    // For compatibility
  details?: Record<string, any>
  ip_address?: string
  channel: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user_id: string
  role: string
  is_trusted: boolean
}

export interface UserProfile {
  user_id: string
  username?: string
  role: string
  is_trusted: boolean
  report_count: number
  reputation_score: number
  member_since: string
}

export type ScamType =
  | 'romance'
  | 'investment'
  | 'phishing'
  | 'impersonation'
  | 'online_shopping'
  | 'job_offer'
  | 'loan_fraud'
  | 'other'

export const SCAM_TYPE_LABELS: Record<ScamType, string> = {
  romance: 'Romance Scam',
  investment: 'Investment / Ponzi',
  phishing: 'Phishing',
  impersonation: 'Impersonation (Bank/EFCC)',
  online_shopping: 'Online Shopping Fraud',
  job_offer: 'Fake Job Offer',
  loan_fraud: 'Loan Fraud',
  other: 'Other',
}

export const RISK_COLORS: Record<RiskLevel, { text: string; bg: string; border: string; glow: string }> = {
  LOW: {
    text: 'text-signal-400',
    bg: 'bg-signal-500/10',
    border: 'border-signal-500/30',
    glow: 'glow-signal',
  },
  MEDIUM: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'glow-warning',
  },
  HIGH: {
    text: 'text-danger-400',
    bg: 'bg-danger-500/10',
    border: 'border-danger-500/30',
    glow: 'glow-danger',
  },
  CRITICAL: {
    text: 'text-danger-400',
    bg: 'bg-danger-600/20',
    border: 'border-danger-500/50',
    glow: 'glow-danger',
  },
}
