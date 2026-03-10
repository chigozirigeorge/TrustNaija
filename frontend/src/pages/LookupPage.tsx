// ============================================================
// pages/LookupPage.tsx — Identifier lookup & result display
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLookup } from '@/hooks';
import { Card, Button, RiskScoreRing, RiskBadge, Tag, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { updateMetaTags, generateShareUrls, fetchMeta } from '@/lib/meta';
import type { RiskLevel } from '@/types';

export function LookupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { result, loading, error, lookup, clear } = useLookup();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [shareUrls, setShareUrls] = useState<ReturnType<typeof generateShareUrls> | null>(null);

  // Auto-lookup if query param present
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      lookup(q);
    }
  }, []);

  // Update meta tags and generate share URLs when result is available
  useEffect(() => {
    if (result && query) {
      // Update HTML meta tags for social sharing and SEO
      const pageUrl = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(query)}`;
      updateMetaTags(
        {
          identifier: query,
          identifier_type: result.identifier_type,
          risk_score: result.risk_score,
          risk_level: result.risk_level,
          report_count: result.report_count,
          is_known: result.is_known,
          og_title: result.is_known
            ? `⚠️ Scam Alert: ${query} | Risk: ${result.risk_level}`
            : `Check: ${query} | TrustNaija`,
          og_description: result.is_known
            ? `Risk Score: ${result.risk_score}/100 | ${result.risk_level} | ${result.report_count} reports filed. Stay safe with TrustNaija.`
            : `No reports found for ${query} | Safe to transact | TrustNaija fraud detection`,
          og_image: `https://trust-naija.vercel.app/risk-${result.risk_level.toLowerCase()}.png`,
        },
        window.location.origin
      );

      // Generate social share URLs
      setShareUrls(generateShareUrls(
        {
          identifier: query,
          identifier_type: result.identifier_type,
          risk_score: result.risk_score,
          risk_level: result.risk_level,
          report_count: result.report_count,
          is_known: result.is_known,
          og_title: result.is_known
            ? `⚠️ Scam Alert: ${query}`
            : `Check: ${query}`,
          og_description: result.is_known
            ? `${result.report_count} reports filed`
            : 'No reports found',
          og_image: '',
        },
        pageUrl
      ));
    }
  }, [result, query]);

  const handleSearch = () => {
    if (!query.trim()) return;
    navigate(`/lookup?q=${encodeURIComponent(query.trim())}`, { replace: true });
    lookup(query.trim());
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Page title */}
      <div className="mb-8">
        <div className="text-xs font-mono text-brand-green tracking-widest mb-2">🔍 IDENTIFIER CHECK</div>
        <h1 className="font-display font-black text-4xl mb-2">
          Lookup <span className="text-brand-green">Tool</span>
        </h1>
        <p className="text-white/40 font-body">Check any phone, URL, wallet, or bank account number</p>
      </div>

      {/* Search input */}
      <div className="flex gap-3 mb-10">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter phone, URL, wallet address, or account..."
          className="flex-1 px-5 py-4 rounded-xl font-body text-base text-white placeholder:text-white/25 input-field"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <Button onClick={handleSearch} loading={loading}>
          Search
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-xs font-mono text-brand-green tracking-widest">
            SCANNING DATABASE<span className="animate-blink">...</span>
          </div>
          <div className="mt-8 space-y-4">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="p-8" glow="danger">
          <div className="text-red-500 font-mono font-bold mb-2">⚠️ Lookup Failed</div>
          <p className="text-white/60 font-body text-sm">{error}</p>
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="animate-fade-up space-y-4">
          {/* Main result card */}
          <Card glow={result.risk_score >= 70 ? 'danger' : 'none'} className="p-10">
            {/* Identifier header */}
            <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="text-white/35 text-xs font-mono tracking-widest uppercase mb-2">
                  {result.identifier_type}
                </div>
                <div className="font-mono font-black text-2xl text-white break-all">{query}</div>
              </div>
              <RiskBadge level={result.risk_level as RiskLevel} score={result.risk_score} />
            </div>

            {/* Score + metrics grid */}
            <div className="flex items-center gap-12 mb-8 flex-wrap">
              <RiskScoreRing score={result.risk_score} level={result.risk_level as RiskLevel} />

              <div className="grid grid-cols-2 gap-6 flex-1">
                {[
                  { label: 'Reports Filed', value: result.is_known ? String(result.report_count) : '0', danger: result.report_count > 0 },
                  { label: 'Status', value: result.is_known ? 'Known Threat' : 'Not Reported' },
                  { label: 'First Seen', value: formatDate(result.first_seen_at) },
                  { label: 'Last Seen', value: formatDate(result.last_seen_at) },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="text-white/30 text-[10px] font-mono tracking-widest uppercase mb-1">{m.label}</div>
                    <div
                      className="font-display font-bold text-xl"
                      style={{ color: m.danger ? '#D92D20' : 'white' }}
                    >
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {result.tags.length > 0 && (
              <div>
                <div className="text-white/30 text-[10px] font-mono tracking-widest uppercase mb-2">Scam Tags</div>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag: string) => <Tag key={tag}>{tag}</Tag>)}
                </div>
              </div>
            )}
          </Card>

          {/* Warning banner */}
          {result.risk_score >= 70 && (
            <div
              className="flex items-center gap-4 p-5 rounded-xl"
              style={{ background: 'rgba(217,45,32,0.1)', border: '1px solid rgba(217,45,32,0.3)' }}
            >
              <span className="text-3xl flex-shrink-0">⚠️</span>
              <div>
                <div className="text-brand-danger font-mono font-bold text-sm mb-1">HIGH RISK — DO NOT TRANSACT</div>
                <p className="text-white/55 font-body text-sm leading-relaxed">
                  This identifier has been reported multiple times. Exercise extreme caution.
                  If you've been defrauded, report to EFCC or your bank immediately.
                </p>
              </div>
            </div>
          )}

          {/* Clean banner */}
          {!result.is_known && (
            <div
              className="flex items-center gap-4 p-5 rounded-xl"
              style={{ background: 'rgba(15,169,88,0.08)', border: '1px solid rgba(15,169,88,0.2)' }}
            >
              <span className="text-3xl flex-shrink-0">✅</span>
              <div>
                <div className="text-brand-green font-mono font-bold text-sm mb-1">NOT REPORTED YET</div>
                <p className="text-white/55 font-body text-sm leading-relaxed">
                  No reports on file. Always exercise caution regardless. If this turns out to be a scam, please report it.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button variant="danger" onClick={() => navigate(`/report?identifier=${encodeURIComponent(query)}`)}>
              🚨 Report This
            </Button>
            <Button variant="secondary">📄 Download Report</Button>
            <Button variant="ghost" onClick={clear}>Clear</Button>
          </div>

          {/* Share section */}
          {shareUrls && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="text-white/30 text-[10px] font-mono tracking-widest uppercase mb-4">Share Result</div>
              <div className="flex gap-3 flex-wrap">
                <a
                  href={shareUrls.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-green-400"
                >
                  💬 WhatsApp
                </a>
                <a
                  href={shareUrls.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-blue-400"
                >
                  𝕏 Twitter
                </a>
                <a
                  href={shareUrls.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-blue-600"
                >
                  👍 Facebook
                </a>
                <a
                  href={shareUrls.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-blue-500"
                >
                  💼 LinkedIn
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
