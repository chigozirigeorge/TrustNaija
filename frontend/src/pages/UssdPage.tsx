import React, { useState } from 'react'
import { Phone, ChevronDown, ChevronUp, Signal, Wifi, CheckCircle } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'

const FAQ = [
  {
    q: 'Which networks support TrustNaija USSD?',
    a: 'TrustNaija USSD works on MTN, Airtel, Glo, and 9Mobile. Simply dial *234*2# from any of these networks.',
  },
  {
    q: 'Is USSD lookup free?',
    a: 'Standard USSD session charges may apply from your network operator. Typically less than ₦10 per session.',
  },
  {
    q: 'Can I report a scam via USSD?',
    a: 'Yes! From the main menu, select option 2 to report a scammer. You can submit the phone number and select the scam type.',
  },
  {
    q: 'How accurate are the USSD results?',
    a: 'USSD results are powered by the same database as our web platform — fully up to date in real time.',
  },
  {
    q: 'What happens after I press 1 for SMS alert?',
    a: 'We send a detailed SMS to your phone with full risk details, tags, and report count within seconds.',
  },
]

const STEPS = [
  { step: 'Dial', code: '*234*2#', desc: 'Open TrustNaija USSD menu' },
  { step: 'Press 1', code: '1', desc: 'Choose "Check a number/account"' },
  { step: 'Enter', code: '08012345678', desc: 'Type the number to check' },
  { step: 'Result', code: 'Instant', desc: 'See risk score on your screen' },
]

export function UssdPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-display font-semibold tracking-widest uppercase text-signal-500 mb-3">USSD Guide</p>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            No Internet? No Problem.
          </h1>
          <p className="text-slate-400 font-body text-lg max-w-xl mx-auto">
            Verify any phone number or account from any mobile phone in Nigeria — no data required.
          </p>
        </div>

        {/* Main USSD code display */}
        <div className="relative flex flex-col items-center mb-16">
          <div className="relative z-10 bg-navy-900 border-2 border-signal-500/40 rounded-3xl px-12 py-10 text-center glow-signal">
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-signal-500 mb-4">
              TrustNaija USSD Code
            </p>
            <p className="text-5xl sm:text-6xl font-mono font-bold text-white tracking-widest mb-4">
              *234*2#
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Signal className="w-3 h-3 text-signal-400" /> MTN</span>
              <span className="flex items-center gap-1.5"><Signal className="w-3 h-3 text-signal-400" /> Airtel</span>
              <span className="flex items-center gap-1.5"><Signal className="w-3 h-3 text-signal-400" /> Glo</span>
              <span className="flex items-center gap-1.5"><Signal className="w-3 h-3 text-signal-400" /> 9Mobile</span>
            </div>
          </div>

          {/* Shortcut */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 font-body mb-2">Quick lookup shortcut:</p>
            <code className="text-sm font-mono text-slate-300 bg-navy-800 px-4 py-2 rounded-lg border border-white/8">
              *234*2*<span className="text-signal-400">PHONENUMBER</span>#
            </code>
          </div>
        </div>

        {/* Steps */}
        <div className="mb-16">
          <h2 className="text-xl font-display font-bold text-white mb-6 text-center">How to use</h2>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-signal-500/30 via-signal-500/10 to-transparent hidden sm:block" />

            <div className="space-y-4">
              {STEPS.map(({ step, code, desc }, i) => (
                <div key={step} className="flex items-center gap-6 bg-navy-900/50 rounded-xl p-5 border border-white/[0.06] hover:border-white/10 transition-colors">
                  <div className="relative shrink-0 w-12 h-12 rounded-xl bg-signal-500/10 border border-signal-500/20 flex items-center justify-center font-display font-bold text-signal-400 text-xs">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-display font-semibold tracking-wider uppercase text-slate-500">{step}</span>
                      <code className="font-mono text-sm text-white bg-navy-800 px-3 py-1 rounded-lg border border-white/10">{code}</code>
                    </div>
                    <p className="text-sm text-slate-400 font-body mt-1">{desc}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-signal-500/30 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phone mockup menu */}
        <div className="flex flex-col sm:flex-row gap-8 items-start mb-16">
          <div className="w-full sm:w-auto shrink-0">
            <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-hidden w-full sm:w-64">
              <div className="bg-navy-800 px-4 py-3 flex items-center gap-2 border-b border-white/8">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-mono">USSD Session</span>
              </div>
              <div className="p-4 font-mono text-sm space-y-1 text-slate-300">
                <p className="text-signal-400 font-semibold">Welcome to TrustNaija</p>
                <p className="text-slate-500">Nigeria Fraud Intelligence</p>
                <p className="mt-3"> </p>
                <p>1. Check a number/account</p>
                <p>2. Report a scammer</p>
                <p>3. About TrustNaija</p>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-display font-bold text-white text-lg mb-3">USSD Menu Options</h3>
            <div className="space-y-3">
              {[
                { num: '1', title: 'Check a number/account', desc: 'Instantly check any phone number, bank account, or URL for fraud reports.' },
                { num: '2', title: 'Report a scammer', desc: 'Submit a fraud report directly from your phone — no internet or app needed.' },
                { num: '3', title: 'About TrustNaija', desc: 'Learn about the platform and how to get SMS alerts.' },
              ].map(({ num, title, desc }) => (
                <div key={num} className="flex gap-4 p-4 rounded-xl bg-navy-900/40 border border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-navy-800 border border-white/10 flex items-center justify-center font-mono text-sm text-signal-400 font-bold shrink-0">
                    {num}
                  </div>
                  <div>
                    <p className="text-sm font-display font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-400 font-body mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-display font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] overflow-hidden bg-navy-900/40">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-display font-semibold text-white pr-4">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-400 font-body leading-relaxed border-t border-white/[0.04]">
                    <p className="pt-3">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
