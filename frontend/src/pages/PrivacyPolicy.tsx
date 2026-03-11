import React from 'react';
import { Card } from '@/components/ui';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white font-body">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <h1 className="font-display text-4xl sm:text-5xl font-black mb-4">Privacy Policy</h1>
        <p className="text-white/60 text-lg">Last updated: March 10, 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20 space-y-8">
        {/* Introduction */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">Introduction</h2>
          <p className="text-white/80 leading-relaxed">
            TrustNaija ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and services.
          </p>
          <p className="text-white/80 leading-relaxed">
            Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our services.
          </p>
        </Card>

        {/* 1. Information We Collect */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">1. Information We Collect</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">Information You Provide Directly</h3>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li><strong>Registration Data:</strong> Phone number, OTP verification codes</li>
                <li><strong>Report Data:</strong> Scam details, identifiers (phone, URL, wallet), descriptions, amounts lost</li>
                <li><strong>Lookup Queries:</strong> Identifiers you search for on our platform</li>
                <li><strong>Communication Data:</strong> Messages sent via WhatsApp, feedback, support requests</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">Information Collected Automatically</h3>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li><strong>Device Information:</strong> Device type, operating system, browser type</li>
                <li><strong>Access Logs:</strong> IP address, timestamp, pages visited, referrer URL</li>
                <li><strong>Cookies & Tracking:</strong> We use cookies to improve user experience</li>
                <li><strong>Usage Analytics:</strong> Search patterns, command usage, interaction data</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">Third-Party Data</h3>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li>Data from Meta (WhatsApp Business API) for messaging</li>
                <li>Data from Termii for SMS/OTP delivery</li>
                <li>Data from external scam databases for risk scoring</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* 2. How We Use Your Information */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2 text-white/80">
            <li>To verify your identity and provide authentication services</li>
            <li>To process and moderate scam reports you submit</li>
            <li>To calculate risk scores and identifier data</li>
            <li>To prevent fraud, abuse, and security threats</li>
            <li>To improve our platform and user experience</li>
            <li>To comply with legal obligations and law enforcement requests</li>
            <li>To send you important updates about our service</li>
            <li>To conduct analytics and research</li>
          </ul>
        </Card>

        {/* 3. Data Sharing & Disclosure */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">3. Data Sharing & Disclosure</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">We Share Data With:</h3>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li><strong>Service Providers:</strong> Termii (SMS), Meta (WhatsApp), hosting providers</li>
                <li><strong>Moderators:</strong> To review and approve scam reports</li>
                <li><strong>Law Enforcement:</strong> When required by law or court order</li>
                <li><strong>Public:</strong> Anonymized scam data helps protect the community</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">We Do NOT:</h3>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li>Sell your personal data to third parties</li>
                <li>Share phone numbers without explicit consent</li>
                <li>Disclose reporter identities (reports are anonymous unless verified)</li>
                <li>Use your data for marketing without permission</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* 4. Data Retention */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">4. Data Retention</h2>
          <ul className="list-disc list-inside space-y-2 text-white/80">
            <li><strong>Account Data:</strong> Retained for 2 years after last login</li>
            <li><strong>Report Data:</strong> Retained indefinitely for fraud prevention</li>
            <li><strong>Audit Logs:</strong> Retained for 5 years for compliance</li>
            <li><strong>Usage Logs:</strong> Retained for 90 days for analytics</li>
            <li><strong>WhatsApp Messages:</strong> Retained for 30 days unless archived</li>
          </ul>
        </Card>

        {/* 5. Security Measures */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">5. Security Measures</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80">
            <li>End-to-end encryption for sensitive data</li>
            <li>HTTPS/TLS for all communications</li>
            <li>PostgreSQL database with row-level security</li>
            <li>Redis caching with automatic expiration</li>
            <li>Rate limiting to prevent abuse</li>
            <li>Regular security audits and penetration testing</li>
            <li>IP address logging for audit trails</li>
          </ul>
        </Card>

        {/* 6. Your Rights */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">6. Your Rights</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
            <li><strong>Erasure:</strong> Request deletion of your data (subject to legal holds)</li>
            <li><strong>Restrict Processing:</strong> Limit how we use your data</li>
            <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
            <li><strong>Withdraw Consent:</strong> Opt-out of optional data collection</li>
          </ul>
          <p className="text-white/80 mt-4">
            To exercise these rights, contact us at: <strong>privacy@trustnaija.com</strong>
          </p>
        </Card>

        {/* 7. Cookies & Tracking Technologies */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">7. Cookies & Tracking Technologies</h2>
          <p className="text-white/80 leading-relaxed">
            We use cookies to remember your preferences, understand your usage patterns, and improve our platform. You can control cookies through your browser settings.
          </p>
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-white/80 text-sm">
              <strong>Cookie Types:</strong><br/>
              • Essential: Required for functionality<br/>
              • Analytics: To understand usage patterns<br/>
              • Preference: To remember your settings
            </p>
          </div>
        </Card>

        {/* 8. Children's Privacy */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">8. Children's Privacy</h2>
          <p className="text-white/80 leading-relaxed">
            TrustNaija is not intended for children under 13. We do not knowingly collect personal information from children. If we learn we have collected data from a child, we will delete it immediately.
          </p>
        </Card>

        {/* 9. International Transfers */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">9. International Data Transfers</h2>
          <p className="text-white/80 leading-relaxed">
            Your data may be transferred to and processed in countries other than Nigeria. We ensure adequate protections through Standard Contractual Clauses and similar mechanisms.
          </p>
        </Card>

        {/* 10. Updates to This Policy */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">10. Updates to This Policy</h2>
          <p className="text-white/80 leading-relaxed">
            We may update this Privacy Policy periodically. Material changes will be communicated to you via email or prominent notice on our website. Your continued use of our services constitutes acceptance of the updated policy.
          </p>
        </Card>

        {/* 11. Contact Us */}
        <Card className="p-6 space-y-4 border-brand-green/30">
          <h2 className="font-display text-2xl font-bold">11. Contact Us</h2>
          <p className="text-white/80 leading-relaxed">
            If you have questions about this Privacy Policy or our data practices:
          </p>
          <div className="space-y-2 text-white/80">
            <p><strong>Email:</strong> privacy@trustnaija.com</p>
            <p><strong>Address:</strong> TrustNaija, Nigeria</p>
            <p><strong>Data Protection Officer:</strong> Available upon request</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
