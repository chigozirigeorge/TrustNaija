import React from 'react'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-navy-950/80 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-signal-500/15 border border-signal-500/30 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-signal-400" />
              </div>
              <span className="font-display font-bold text-white">Trust<span className="text-signal-400">Naija</span></span>
            </div>
            <p className="text-sm text-slate-500 font-body leading-relaxed">
              Nigeria's fraud intelligence platform. Protecting Nigerians from scammers one lookup at a time.
            </p>
          </div>

          <div>
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500 mb-4">Platform</p>
            <ul className="space-y-2.5">
              {[['/', 'Check Identifier'], ['/report', 'Report Scam'], ['/ussd', 'USSD Guide'], ['/evidence', 'Evidence Vault']].map(([href, label]) => (
                <li key={href}>
                  <Link to={href} className="text-sm text-slate-400 hover:text-white transition-colors font-body">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500 mb-4">Channels</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-navy-800 border border-white/8 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-signal-400">##</span>
                </div>
                <div>
                  <p className="text-xs text-white font-body font-medium">USSD</p>
                  <p className="text-xs text-slate-500 font-mono">*234*2#</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-navy-800 border border-white/8 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-signal-400">API</span>
                </div>
                <div>
                  <p className="text-xs text-white font-body font-medium">Developer API</p>
                  <p className="text-xs text-slate-500 font-body">For fintechs & banks</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600 font-body">© {new Date().getFullYear()} TrustNaija. Protecting Nigeria from fraud.</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse" />
            <span className="text-xs text-slate-500 font-mono">System Operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
