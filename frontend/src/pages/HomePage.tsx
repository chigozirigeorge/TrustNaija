import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Search, AlertTriangle, CheckCircle, Users, Zap, Globe, Phone } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { PageLayout } from '@/components/layout/PageLayout'
import { cn } from '@/lib/utils'

const STATS = [
  { value: '14,200+', label: 'Scammers Flagged' },
  { value: '₦2.1B', label: 'Losses Prevented' },
  { value: '98,000+', label: 'Lookups This Month' },
  { value: '4 Networks', label: 'USSD Coverage' },
]

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: 'Enter Identifier',
    desc: 'Input a phone number, bank account, URL, wallet address, or app package name.',
  },
  {
    icon: Zap,
    title: 'Instant Analysis',
    desc: 'Our risk engine cross-references thousands of verified reports in milliseconds.',
  },
  {
    icon: Shield,
    title: 'Get Risk Score',
    desc: 'See a 0–100 risk score, scam type tags, and report history before you transact.',
  },
]

const IDENTIFIER_EXAMPLES = [
  { icon: Phone, label: 'Phone Numbers', example: '0812 345 6789', type: 'phone' },
  { icon: Globe, label: 'URLs & Links', example: 'paystack-verify.com', type: 'url' },
  { icon: AlertTriangle, label: 'Crypto Wallets', example: '0xAbCd...3F4E', type: 'wallet' },
  { icon: CheckCircle, label: 'App Packages', example: 'com.fakebank.ng', type: 'app' },
]

export function HomePage() {
  const navigate = useNavigate()
  const [searching, setSearching] = useState(false)

  const handleSearch = (identifier: string) => {
    navigate(`/result?q=${encodeURIComponent(identifier)}`)
  }

  return (
    <PageLayout>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid-pattern" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-signal-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 right-0 w-72 h-72 bg-navy-700/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* System status indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-900/80 border border-signal-500/20 mb-8 text-xs font-mono text-signal-400 animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-400 animate-pulse" />
            Intelligence System Online · 14,200 identifiers indexed
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl text-white leading-[1.05] tracking-tight mb-6 animate-fade-up animate-delay-100">
            Check Before
            <br />
            <span className="text-gradient-signal">You Pay.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 font-body max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up animate-delay-200">
            Nigeria's fraud intelligence platform. Verify any phone number, account, URL, or crypto wallet before you send money.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto animate-fade-up animate-delay-300">
            <SearchBar
              onSearch={handleSearch}
              loading={searching}
              size="large"
              placeholder="Phone, account, URL, or wallet address…"
            />
            <p className="text-xs text-slate-600 mt-3 font-body">
              Try: 08012345678 · paystack-fake.com · 0xAbCd… · com.fakeapp.ng
            </p>
          </div>

          {/* Identifier type pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8 animate-fade-up animate-delay-400">
            {IDENTIFIER_EXAMPLES.map(({ icon: Icon, label, example, type }) => (
              <button
                key={type}
                onClick={() => handleSearch(example)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-900/60 border border-white/8 text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all font-body group"
              >
                <Icon className="w-3 h-3 text-slate-600 group-hover:text-signal-400 transition-colors" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────── */}
      <section className="py-12 px-4 border-y border-white/[0.04] bg-navy-900/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-white mb-1">{value}</div>
              <div className="text-xs text-slate-500 font-body tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-signal-500 mb-3">How It Works</p>
            <h2 className="text-3xl font-display font-bold text-white">Three steps to stay safe</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative p-6 rounded-xl bg-navy-900/50 border border-white/[0.06] group hover:border-signal-500/20 transition-all duration-300">
                <div className="absolute top-5 right-5 font-display font-bold text-5xl text-white/[0.03] select-none">
                  0{i + 1}
                </div>
                <div className="w-10 h-10 rounded-xl bg-signal-500/10 border border-signal-500/20 flex items-center justify-center mb-4 group-hover:bg-signal-500/20 transition-colors">
                  <Icon className="w-5 h-5 text-signal-400" />
                </div>
                <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 font-body leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USSD CTA ──────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 border border-white/8 p-8 sm:p-12">
            <div className="absolute inset-0 bg-grid-pattern opacity-50" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-signal-500/5 rounded-full blur-3xl" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-signal-500/10 border border-signal-500/20 text-xs font-display text-signal-400 font-semibold tracking-wider mb-4">
                  NO SMARTPHONE NEEDED
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3">
                  Works on any phone
                </h2>
                <p className="text-slate-400 font-body text-sm sm:text-base max-w-sm leading-relaxed">
                  No internet required. Dial <span className="font-mono text-white bg-navy-700 px-2 py-0.5 rounded">*234*2#</span> from any network to verify instantly.
                </p>
              </div>
              <div className="shrink-0">
                <div className="bg-navy-950/60 border border-white/10 rounded-xl p-5 font-mono text-sm min-w-[200px]">
                  <p className="text-slate-500 text-xs mb-3 font-display uppercase tracking-wider">USSD Code</p>
                  <p className="text-signal-400 text-xl font-bold tracking-widest">*234*2#</p>
                  <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                    Available on MTN, Airtel,<br />Glo & 9Mobile
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
