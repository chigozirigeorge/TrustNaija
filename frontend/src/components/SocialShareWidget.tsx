/**
 * components/SocialShareWidget.tsx
 * 
 * Displays social sharing options with proper Open Graph metadata
 * Handles dynamic meta tag generation and share link generation
 */

import { useState } from 'react';
import type { RiskLevel } from '@/types';

interface SocialShareWidgetProps {
  identifier: string;
  identifier_type: string;
  risk_level: RiskLevel;
  risk_score: number;
  is_known: boolean;
  report_count: number;
}

export function SocialShareWidget({
  identifier,
  identifier_type,
  risk_level,
  risk_score,
  is_known,
  report_count,
}: SocialShareWidgetProps) {
  const [copied, setCopied] = useState(false);

  const pageUrl = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(identifier)}`;
  const title = is_known
    ? `⚠️ Scam Alert: ${identifier} - Risk: ${risk_level}`
    : `Check: ${identifier} on TrustNaija`;
  const description = is_known
    ? `${report_count} reports | Risk: ${risk_score}/100 | Stay safe with TrustNaija`
    : `No reports found. Safe to transact.`;

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n${pageUrl}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}&via=TrustNaija`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div className="text-xs font-mono text-brand-green uppercase tracking-wider">
        Share This Check
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* WhatsApp */}
        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors text-sm"
        >
          <span>💬</span>
          <span>WhatsApp</span>
        </a>

        {/* Twitter */}
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors text-sm"
        >
          <span>𝕏</span>
          <span>Tweet</span>
        </a>

        {/* Facebook */}
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 transition-colors text-sm"
        >
          <span>👍</span>
          <span>Facebook</span>
        </a>

        {/* LinkedIn */}
        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-400/20 hover:bg-blue-400/30 text-blue-200 transition-colors text-sm"
        >
          <span>💼</span>
          <span>LinkedIn</span>
        </a>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-colors text-sm"
        >
          <span>{copied ? '✓' : '🔗'}</span>
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>

      {/* Preview info */}
      <div className="pt-3 border-t border-white/10 space-y-1">
        <div className="text-xs text-white/50 font-mono">
          Preview: {title.slice(0, 50)}...
        </div>
        <div className="text-xs text-white/40 font-mono">
          Type: {identifier_type}
        </div>
      </div>
    </div>
  );
}
