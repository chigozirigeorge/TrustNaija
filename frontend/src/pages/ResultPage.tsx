import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, Calendar, BarChart3, Hash, RefreshCw, Flag, ChevronLeft, Clock, Info } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { RiskScoreRing } from '@/components/ui/RiskScoreRing'
import { RiskBadge, TagBadge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Button } from '@/components/ui/Button'
import { useLookup } from '@/hooks/useLookup'
import { formatDate } from '@/lib/utils'
import type { LookupResult } from '@/types'

function ResultSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-navy-800 rounded-lg w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-navy-800 rounded-xl" />
        <div className="lg:col-span-2 h-64 bg-navy-800 rounded-xl" />
      </div>
    </div>
  )
}

function ResultContent({ result }: { result: LookupResult }) {
  const navigate = useNavigate()

  const riskColor = {
    LOW: 'border-signal-500/25',
    MEDIUM: 'border-amber-500/25',
    HIGH: 'border-danger-500/35',
    CRITICAL: 'border-danger-500/50',
  }[result.risk_level]

  const riskBg = {
    LOW: '',
    MEDIUM: '',
    HIGH: 'bg-danger-500/5',
    CRITICAL: 'bg-danger-500/10',
  }[result.risk_level]

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Result header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500 mb-1">
            Lookup Result
          </p>
          <h1 className="text-2xl font-display font-bold text-white font-mono tracking-tight">
            {result.identifier}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500 font-mono bg-navy-800/80 px-2 py-0.5 rounded-md border border-white/8">
              {result.identifier_type.toUpperCase()}
            </span>
            {!result.is_known && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" /> First time this identifier has been searched
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/report?identifier=${encodeURIComponent(result.identifier)}`)}
        >
          <Flag className="w-3.5 h-3.5" />
          Report This
        </Button>
      </div>

      {/* Main result card */}
      <div className={`rounded-xl border ${riskColor} ${riskBg} overflow-hidden`}>
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Score column */}
          <div className="p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/[0.06]">
            <RiskScoreRing
              score={result.risk_score}
              level={result.risk_level}
              size={156}
            />
            <div className="mt-6 text-center">
              <RiskBadge level={result.risk_level} size="lg" />
            </div>
          </div>

          {/* Details column */}
          <div className="lg:col-span-2 p-6 sm:p-8 space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-navy-900/60 rounded-xl p-4 border border-white/[0.05]">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="text-xs font-display uppercase tracking-widest">Reports</span>
                </div>
                <p className="text-2xl font-display font-bold text-white">{result.report_count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{result.is_known ? 'verified' : 'filed'}</p>
              </div>

              <div className="bg-navy-900/60 rounded-xl p-4 border border-white/[0.05]">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-display uppercase tracking-widest">First Seen</span>
                </div>
                <p className="text-sm font-display font-semibold text-white">{formatDate(result.first_seen_at)}</p>
              </div>

              <div className="bg-navy-900/60 rounded-xl p-4 border border-white/[0.05]">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-display uppercase tracking-widest">Last Seen</span>
                </div>
                <p className="text-sm font-display font-semibold text-white">{formatDate(result.last_seen_at)}</p>
              </div>
            </div>

            {/* Tags */}
            {result.tags && result.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-xs font-display uppercase tracking-widest">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag) => (
                    <TagBadge key={tag}>{tag.replace(/_/g, ' ')}</TagBadge>
                  ))}
                </div>
              </div>
            )}

            {/* Risk verdict */}
            {!result.is_known ? (
              <div className="p-4 rounded-xl bg-signal-500/10 border border-signal-500/20">
                <p className="text-sm font-display font-semibold text-signal-400 mb-1">✓ No reports found</p>
                <p className="text-xs text-slate-400 font-body leading-relaxed">
                  This identifier has not been reported to TrustNaija. However, exercise caution — absence of reports does not guarantee safety. Always verify through official channels.
                </p>
              </div>
            ) : result.risk_level === 'CRITICAL' || result.risk_level === 'HIGH' ? (
              <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/25">
                <p className="text-sm font-display font-semibold text-danger-400 mb-1">
                  ⚠ {result.risk_level === 'CRITICAL' ? 'Critical Risk — Do Not Transact' : 'High Risk — Proceed With Extreme Caution'}
                </p>
                <p className="text-xs text-slate-400 font-body leading-relaxed">
                  This identifier has been reported {result.report_count} time{result.report_count !== 1 ? 's' : ''} for fraud. We strongly advise against sending money or sharing personal information.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-display font-semibold text-amber-400 mb-1">⚡ Medium Risk — Verify Further</p>
                <p className="text-xs text-slate-400 font-body leading-relaxed">
                  Some reports have been filed. Exercise caution and verify through official channels before proceeding.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap gap-3">
        <Link to="/report">
          <Button variant="secondary" size="sm">
            <Flag className="w-3.5 h-3.5" />
            Submit a Report
          </Button>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-3.5 h-3.5" />
            New Lookup
          </Button>
        </Link>
      </div>
    </div>
  )
}

export function ResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const identifier = searchParams.get('q') || ''
  const { result, loading, error, lookup } = useLookup()

  useEffect(() => {
    if (identifier) lookup(identifier)
  }, [identifier])

  const handleNewSearch = (newIdentifier: string) => {
    navigate(`/result?q=${encodeURIComponent(newIdentifier)}`)
  }

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors mb-8 font-body">
          <ChevronLeft className="w-4 h-4" />
          Back to search
        </Link>

        <div className="mb-8">
          <SearchBar
            onSearch={handleNewSearch}
            loading={loading}
            defaultValue={identifier}
          />
        </div>

        {loading && <ResultSkeleton />}

        {error && (
          <div className="p-6 rounded-xl border border-danger-500/25 bg-danger-500/10 flex items-center gap-4">
            <AlertTriangle className="w-5 h-5 text-danger-400 shrink-0" />
            <div>
              <p className="text-sm font-display font-semibold text-danger-300 mb-1">Lookup Failed</p>
              <p className="text-sm text-slate-400 font-body">{error}</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => lookup(identifier)}>
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        )}

        {result && !loading && <ResultContent result={result} />}
      </div>
    </PageLayout>
  )
}
