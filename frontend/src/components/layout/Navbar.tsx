import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Shield, Menu, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/report', label: 'Report Scam' },
  { href: '/ussd', label: 'USSD Guide' },
  { href: '/evidence', label: 'Evidence Vault' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMobileOpen(false), [location])

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-navy-950/95 backdrop-blur-md border-b border-white/[0.06]' : 'bg-transparent'
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-signal-500/15 border border-signal-500/30 flex items-center justify-center group-hover:bg-signal-500/25 transition-colors">
            <Shield className="w-4 h-4 text-signal-400" />
          </div>
          <span className="font-display font-bold text-white text-lg tracking-tight">
            Trust<span className="text-signal-400">Naija</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-150',
                location.pathname === link.href
                  ? 'text-white bg-white/8'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-150',
                location.pathname.startsWith('/admin')
                  ? 'text-signal-400 bg-signal-500/10'
                  : 'text-slate-400 hover:text-signal-400 hover:bg-signal-500/5'
              )}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 border border-white/8">
                <div className="w-2 h-2 rounded-full bg-signal-400 animate-pulse-slow" />
                <span className="text-sm text-slate-300 font-body">{user?.username || 'Reporter'}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-navy-950/98 backdrop-blur-md border-t border-white/[0.06] px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-body text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </Link>
          ))}
          <div className="pt-3 border-t border-white/[0.06]">
            {isAuthenticated ? (
              <Button variant="ghost" size="md" className="w-full" onClick={logout}>Sign Out</Button>
            ) : (
              <Link to="/login" className="block">
                <Button variant="primary" size="md" className="w-full">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
