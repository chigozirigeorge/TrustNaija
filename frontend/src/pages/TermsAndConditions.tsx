import React from 'react';
import { Card } from '@/components/ui';

export function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-black text-white font-body">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <h1 className="font-display text-4xl sm:text-5xl font-black mb-4">Terms & Conditions</h1>
        <p className="text-white/60 text-lg">Last updated: March 10, 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20 space-y-8">
        {/* Introduction */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">Agreement to Terms</h2>
          <p className="text-white/80 leading-relaxed">
            Welcome to TrustNaija. By accessing and using our website and services, you accept and agree to be bound by and comply with these Terms and Conditions. If you do not agree to abide by the above, please do not use this service.
          </p>
        </Card>

        {/* 1. Use License */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">1. Use License</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            Permission is granted to temporarily download one copy of the materials (information or software) on TrustNaija for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Transmit viruses, worms, or other malicious code</li>
          </ul>
        </Card>

        {/* 2. Disclaimer */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">2. Disclaimer</h2>
          <p className="text-white/80 leading-relaxed">
            The materials on TrustNaija are provided "as is." TrustNaija makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
          <p className="text-white/80 leading-relaxed mt-4">
            TrustNaija does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.
          </p>
        </Card>

        {/* 3. Limitations */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">3. Limitations of Liability</h2>
          <p className="text-white/80 leading-relaxed">
            In no event shall TrustNaija or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TrustNaija, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>
          <p className="text-white/80 leading-relaxed mt-4">
            Our total liability to you shall not exceed the amount you have paid us (if any) in the past 12 months.
          </p>
        </Card>

        {/* 4. Accuracy of Materials */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">4. Accuracy of Materials</h2>
          <p className="text-white/80 leading-relaxed">
            The materials appearing on TrustNaija could include technical, typographical, or photographic errors. TrustNaija does not warrant that any of the materials on our website are accurate, complete, or current. TrustNaija may make changes to the materials contained on our website at any time without notice.
          </p>
          <p className="text-white/80 leading-relaxed mt-4">
            While we strive to provide accurate risk scoring and scam identification, TrustNaija does not guarantee the accuracy of identifiers or risk levels. Always verify information from official sources before making financial decisions.
          </p>
        </Card>

        {/* 5. Materials License */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">5. Materials License</h2>
          <p className="text-white/80 leading-relaxed">
            The materials on TrustNaija are copyrighted and any unauthorized use of these materials may violate copyright, trademark, and other laws. You are permitted to display and print pages from TrustNaija for your personal, educational use, provided you do not modify the materials and retain all copyright and other proprietary notices.
          </p>
        </Card>

        {/* 6. User Responsibilities */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">6. User Responsibilities</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">Acceptable Use</h3>
              <p className="text-white/80 leading-relaxed">
                When using TrustNaija, you agree:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/80 mt-2">
                <li>Not to post false, misleading, or malicious information</li>
                <li>Not to harass, abuse, or threaten other users</li>
                <li>Not to submit copyrighted content you don't own</li>
                <li>Not to attempt unauthorized access to our systems</li>
                <li>Not to spam or flood our services</li>
                <li>Not to assist in illegal activities</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">Report Submission</h3>
              <p className="text-white/80 leading-relaxed">
                By submitting a report, you warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/80 mt-2">
                <li>You have actual knowledge of the reported scam</li>
                <li>The information provided is true and accurate</li>
                <li>You have the right to report this information</li>
                <li>You accept liability for false or defamatory reports</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* 7. Account Registration */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">7. Account Registration</h2>
          <p className="text-white/80 leading-relaxed">
            To use certain features of TrustNaija, you may need to register an account. You agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 mt-4">
            <li>Provide accurate and complete information during registration</li>
            <li>Keep your credentials confidential and secure</li>
            <li>Notify us immediately of unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Maintain a valid phone number for OTP verification</li>
          </ul>
        </Card>

        {/* 8. Prohibited Activities */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">8. Prohibited Activities</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            You agree not to engage in any of the following prohibited activities:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80">
            <li>Scraping or crawling our website without permission</li>
            <li>Attempting to bypass security measures</li>
            <li>Submitting false or defamatory reports</li>
            <li>Using bots or automated tools to abuse our services</li>
            <li>Impersonating other users or organizations</li>
            <li>Interfering with the proper functioning of our services</li>
            <li>Violating any applicable laws or regulations</li>
            <li>Using our service for spam, fraud, or phishing</li>
          </ul>
        </Card>

        {/* 9. Third-Party Links */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">9. Third-Party Links & Services</h2>
          <p className="text-white/80 leading-relaxed">
            TrustNaija may contain links to third-party websites. We are not responsible for the content, accuracy, or practices of external websites. Your use of third-party websites is at your own risk and subject to their terms and conditions.
          </p>
          <p className="text-white/80 leading-relaxed mt-4">
            We integrate with Meta (WhatsApp), Termii (SMS), and other third-party services. By using these features, you agree to their respective terms and privacy policies.
          </p>
        </Card>

        {/* 10. Modifications to Service */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">10. Modifications to Service</h2>
          <p className="text-white/80 leading-relaxed">
            TrustNaija reserves the right to modify or discontinue our service at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuance of the service.
          </p>
        </Card>

        {/* 11. Termination */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">11. Termination of Service</h2>
          <p className="text-white/80 leading-relaxed">
            TrustNaija reserves the right to terminate your account and deny access to our services if you:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 mt-4">
            <li>Violate these Terms and Conditions</li>
            <li>Submit false or malicious reports</li>
            <li>Engage in harassment or abuse</li>
            <li>Attempt unauthorized access</li>
            <li>Engage in illegal activities</li>
          </ul>
          <p className="text-white/80 leading-relaxed mt-4">
            Termination is effective immediately upon notice and may result in deletion of your account and data.
          </p>
        </Card>

        {/* 12. Limitation on Reliance */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">12. Limitation on Reliance</h2>
          <p className="text-white/80 leading-relaxed">
            TrustNaija provides risk scores and scam identification as an informational tool only. These results should NOT be your sole basis for financial decisions. Always:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 mt-4">
            <li>Verify information through official channels</li>
            <li>Conduct your own due diligence</li>
            <li>Consult with relevant authorities if needed</li>
            <li>Report suspected fraud to EFCC or law enforcement</li>
          </ul>
        </Card>

        {/* 13. Governing Law */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">13. Governing Law & Jurisdiction</h2>
          <p className="text-white/80 leading-relaxed">
            These Terms and Conditions are governed by and construed in accordance with the laws of Nigeria, and you irrevocably submit to the exclusive jurisdiction of the courts located in Nigeria.
          </p>
        </Card>

        {/* 14. Dispute Resolution */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">14. Dispute Resolution</h2>
          <p className="text-white/80 leading-relaxed">
            Any disputes arising out of or relating to these Terms shall first be subject to negotiation. If negotiation fails, the parties agree to resolve disputes through arbitration in Nigeria.
          </p>
        </Card>

        {/* 15. Entire Agreement */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold">15. Entire Agreement</h2>
          <p className="text-white/80 leading-relaxed">
            These Terms and Conditions constitute the entire agreement between you and TrustNaija regarding your use of our services and supersede all prior and contemporaneous agreements, understandings, negotiations, and discussions.
          </p>
        </Card>

        {/* 16. Contact Information */}
        <Card className="p-6 space-y-4 border-brand-green/30">
          <h2 className="font-display text-2xl font-bold">16. Contact Information</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            For questions about these Terms and Conditions:
          </p>
          <div className="space-y-2 text-white/80">
            <p><strong>Email:</strong> legal@trustnaija.com</p>
            <p><strong>Address:</strong> TrustNaija, Nigeria</p>
            <p><strong>Phone:</strong> Available upon request</p>
          </div>
        </Card>

        {/* Disclaimer Banner */}
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 mt-8">
          <p className="text-red-400 text-sm">
            <strong>⚠️ Important Disclaimer:</strong> TrustNaija is provided as an informational tool. We are not responsible for financial losses, fraud incidents, or any damages resulting from reliance on our data. Always verify information independently before making financial decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
