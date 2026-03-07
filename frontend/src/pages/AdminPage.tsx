import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, BarChart3, Users, Flag, Activity, RefreshCw } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { RiskBadge } from '@/components/ui/Badge'
import { getPendingReports, getAllReports, moderateReport, getAuditLogs } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { AdminReport, AuditLog } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

const MOCK_CHART_DATA = [
  { name: 'Mon', reports: 12, approved: 9 },
  { name: 'Tue', reports: 19, approved: 15 },
  { name: 'Wed', reports: 8, approved: 7 },
  { name: 'Thu', reports: 24, approved: 18 },
  { name: 'Fri', reports: 31, approved: 25 },
  { name: 'Sat', reports: 16, approved: 12 },
  { name: 'Sun', reports: 9, approved: 8 },
]

const MOCK_REPORTS: AdminReport[] = [
  { id: '1', identifier_id: 'abc', scam_type: 'investment', description: 'Promised 50% returns monthly', amount_lost_ngn: 500000, channel: 'web', status: 'pending', created_at: new Date().toISOString(), risk_score: 68 },
  { id: '2', identifier_id: 'def', scam_type: 'romance', channel: 'mobile', status: 'pending', created_at: new Date(Date.now() - 3600000).toISOString(), risk_score: 42 },
  { id: '3', identifier_id: 'ghi', scam_type: 'phishing', description: 'Fake GTBank login page', channel: 'ussd', status: 'pending', created_at: new Date(Date.now() - 7200000).toISOString(), risk_score: 85 },
]

const MOCK_LOGS: AuditLog[] = [
  { id: '1', action: 'report.approved', entity_type: 'report', channel: 'admin', created_at: new Date().toISOString() },
  { id: '2', action: 'lookup.web', entity_type: 'identifier', channel: 'web', created_at: new Date(Date.now() - 60000).toISOString() },
  { id: '3', action: 'report.created', entity_type: 'report', channel: 'ussd', created_at: new Date(Date.now() - 120000).toISOString() },
  { id: '4', action: 'user.verified', entity_type: 'user', channel: 'web', created_at: new Date(Date.now() - 180000).toISOString() },
]

const actionColors: Record<string, string> = {
  'report.approved': 'text-signal-400',
  'report.rejected': 'text-danger-400',
  'report.created': 'text-amber-400',
  'lookup.web': 'text-slate-400',
  'lookup.ussd': 'text-slate-400',
  'user.verified': 'text-blue-400',
}

export function AdminPage() {
  const [reports, setReports] = useState<AdminReport[]>([])
  const [allReports, setAllReports] = useState<AdminReport[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'analytics' | 'logs'>('pending')
  const [moderating, setModerating] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportFilter, setReportFilter] = useState<string>('')

  // Fetch pending reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        const data = await getPendingReports(20, 0)
        setReports(data)
        setError(null)
      } catch (err: any) {
        setError('Failed to load pending reports')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  // Fetch audit logs when logs tab is active
  useEffect(() => {
    if (activeTab !== 'logs') return
    const fetchLogs = async () => {
      try {
        const data = await getAuditLogs(50, 0)
        setLogs(data)
        setError(null)
      } catch (err: any) {
        setError('Failed to load audit logs')
        console.error(err)
      }
    }
    fetchLogs()
  }, [activeTab])

  // Fetch all reports when all reports tab is active
  useEffect(() => {
    if (activeTab !== 'all') return
    const fetchAllReports = async () => {
      try {
        setLoading(true)
        const data = await getAllReports(100, 0, reportFilter || undefined)
        setAllReports(data)
        setError(null)
      } catch (err: any) {
        setError('Failed to load reports')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAllReports()
  }, [activeTab, reportFilter])

  const handleModerate = async (id: string, action: 'approve' | 'reject') => {
    setModerating(id)
    try {
      await moderateReport(id, action, '', undefined)  // action, note, tags
      // Remove the moderated report from the list
      setReports((prev) => prev.filter((r) => r.id !== id))
      setError(null)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || 'Unknown error'
      setError(`Failed to ${action} report: ${errorMsg}`)
      console.error(err)
    } finally {
      setModerating(null)
    }
  }

  const handleRefresh = async () => {
    if (activeTab === 'pending') {
      try {
        setLoading(true)
        const data = await getPendingReports(20, 0)
        setReports(data)
        setError(null)
      } catch (err: any) {
        setError('Failed to refresh pending reports')
        console.error(err)
      } finally {
        setLoading(false)
      }
    } else if (activeTab === 'all') {
      try {
        setLoading(true)
        const data = await getAllReports(100, 0, reportFilter || undefined)
        setAllReports(data)
        setError(null)
      } catch (err: any) {
        setError('Failed to refresh reports')
        console.error(err)
      } finally {
        setLoading(false)
      }
    } else if (activeTab === 'logs') {
      try {
        const data = await getAuditLogs(50, 0)
        setLogs(data)
        setError(null)
      } catch (err: any) {
        setError('Failed to refresh audit logs')
        console.error(err)
      }
    }
  }

  const tabs = [
    { id: 'pending' as const, label: 'Pending Reports', icon: Flag, count: reports.length },
    { id: 'all' as const, label: 'All Reports', icon: BarChart3, count: undefined },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, count: undefined },
    { id: 'logs' as const, label: 'Audit Logs', icon: Activity, count: undefined },
  ]

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-signal-500 mb-1">Admin Panel</p>
            <h1 className="text-2xl font-display font-bold text-white">Moderation Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30">
            <p className="text-sm text-danger-300">{error}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending" value={reports.length} sublabel="needs review" icon={<Clock className="w-4 h-4" />} />
          <StatCard label="Total Reports" value="2,847" sublabel="all time" icon={<Flag className="w-4 h-4" />} />
          <StatCard label="Lookups Today" value="3,194" icon={<BarChart3 className="w-4 h-4" />} />
          <StatCard label="Active Users" value="891" sublabel="this week" icon={<Users className="w-4 h-4" />} />
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 bg-navy-900/60 p-1 rounded-xl border border-white/[0.06] w-fit">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
                activeTab === id
                  ? 'bg-navy-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== undefined && count > 0 && (
                <span className="bg-signal-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-mono">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pending Reports */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {loading && (
              <div className="text-center py-16 text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-signal-500 mb-4" />
                <p className="font-display font-semibold">Loading pending reports...</p>
              </div>
            )}
            {!loading && reports.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-signal-500/30" />
                <p className="font-display font-semibold">All caught up!</p>
                <p className="text-sm mt-1">No pending reports to review.</p>
              </div>
            )}
            {reports.map((report) => (
              <div key={report.id} className="bg-navy-900/60 border border-white/[0.06] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-white/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-slate-500">#{report.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-navy-800 border border-white/8 text-amber-400 font-mono uppercase">
                      {report.scam_type.replace('_', ' ')}
                    </span>
                    <RiskBadge score={report.risk_score} />
                    <span className="text-xs text-slate-600 font-mono">{report.channel}</span>
                  </div>
                  {report.description && (
                    <p className="text-sm text-slate-300 font-body mb-1 line-clamp-1">{report.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                    {report.amount_lost_ngn && (
                      <span className="text-danger-400">₦{(report.amount_lost_ngn).toLocaleString()}</span>
                    )}
                    <span>{formatDate(report.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={moderating === report.id}
                    className="text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
                    onClick={() => handleModerate(report.id, 'reject')}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={moderating === report.id}
                    onClick={() => handleModerate(report.id, 'approve')}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All Reports */}
        {activeTab === 'all' && (
          <div>
            {/* Filter controls */}
            <div className="mb-6 flex gap-2">
              <select 
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value)}
                className="px-4 py-2 rounded-lg bg-navy-800 border border-white/[0.06] text-sm text-white"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-3">
              {loading && (
                <div className="text-center py-16 text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-signal-500 mb-4" />
                  <p className="font-display font-semibold">Loading reports...</p>
                </div>
              )}
              {!loading && allReports.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                  <Flag className="w-10 h-10 mx-auto mb-3 text-slate-600/30" />
                  <p className="font-display font-semibold">No reports found</p>
                  <p className="text-sm mt-1">Try adjusting your filters.</p>
                </div>
              )}
              {allReports.map((report) => (
                <div key={report.id} className="bg-navy-900/60 border border-white/[0.06] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-white/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-slate-500">#{report.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-navy-800 border border-white/8 text-amber-400 font-mono uppercase">
                        {report.scam_type.replace('_', ' ')}
                      </span>
                      <RiskBadge score={report.risk_score} />
                      <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-semibold ${
                        report.status === 'approved' ? 'bg-signal-500/20 text-signal-300' :
                        report.status === 'rejected' ? 'bg-danger-500/20 text-danger-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {report.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-600 font-mono">{report.channel}</span>
                    </div>
                    {report.description && (
                      <p className="text-sm text-slate-300 font-body mb-1 line-clamp-1">{report.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                      {report.amount_lost_ngn && (
                        <span className="text-danger-400">₦{(report.amount_lost_ngn).toLocaleString()}</span>
                      )}
                      <span>{formatDate(report.created_at)}</span>
                    </div>
                  </div>
                  {report.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={moderating === report.id}
                        className="text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
                        onClick={() => handleModerate(report.id, 'reject')}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={moderating === report.id}
                        onClick={() => handleModerate(report.id, 'approve')}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500 mb-4">
                Reports This Week
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MOCK_CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0F2A4D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontFamily: 'DM Sans' }}
                    labelStyle={{ color: '#fff', fontSize: 12 }}
                  />
                  <Bar dataKey="reports" fill="#1D4277" radius={[4, 4, 0, 0]} name="Submitted" />
                  <Bar dataKey="approved" fill="#0FA958" radius={[4, 4, 0, 0]} name="Approved" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500 mb-4">
                Lookup Volume (7 Days)
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={MOCK_CHART_DATA.map((d, i) => ({ ...d, lookups: [320, 485, 270, 612, 798, 445, 290][i] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0F2A4D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="lookups" stroke="#0FA958" strokeWidth={2} dot={{ fill: '#0FA958', r: 3 }} name="Lookups" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500 mb-4">Top Scam Types</p>
              <div className="space-y-3">
                {[
                  { type: 'Investment / Ponzi', count: 842, pct: 35 },
                  { type: 'Online Shopping Fraud', count: 614, pct: 26 },
                  { type: 'Phishing', count: 391, pct: 16 },
                  { type: 'Romance Scam', count: 278, pct: 12 },
                  { type: 'Impersonation', count: 164, pct: 7 },
                ].map(({ type, count, pct }) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-body w-40 shrink-0">{type}</span>
                    <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                      <div className="h-full bg-signal-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-12 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Audit Logs */}
        {activeTab === 'logs' && (
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="bg-navy-900/60 px-5 py-3 border-b border-white/[0.05] flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500">Recent Actions</span>
            </div>
            {logs.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500">
                <p className="font-body text-sm">No audit logs available</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {logs.map((log) => (
                  <div key={log.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className={`font-mono text-xs font-semibold ${actionColors[log.action] || 'text-slate-400'} min-w-[160px]`}>
                      {log.action}
                    </div>
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      {(log.resource_type || log.entity_type) && (
                        <span className="text-xs text-slate-600 font-mono bg-navy-800/80 px-2 py-0.5 rounded">
                          {log.resource_type || log.entity_type}
                        </span>
                      )}
                      <span className="text-xs text-slate-600 font-mono capitalize">{log.channel}</span>
                      {log.ip_address && (
                        <span className="text-xs text-slate-700 font-mono">{log.ip_address}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 font-mono shrink-0">{formatDate(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
