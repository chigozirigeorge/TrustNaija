import React from 'react';
import { Share2, MessageCircle, Heart } from 'lucide-react';

interface SocialShareButtonsProps {
  identifier: string;
  riskScore: number;
  riskLevel: string;
  isKnown: boolean;
}

export default function SocialShareButtons({
  identifier,
  riskScore,
  riskLevel,
  isKnown
}: SocialShareButtonsProps) {
  const shareUrl = `${window.location.origin}/lookup?q=${encodeURIComponent(identifier)}`;
  const title = isKnown 
    ? `⚠️ SCAM ALERT: ${identifier} - Risk Score: ${riskScore}/100` 
    : `✅ SAFE: ${identifier} - Check on TrustNaija`;
  const description = isKnown
    ? `This ${identifier} has been reported as a scam with a risk level of ${riskLevel}. Stay safe! Check TrustNaija for more details.`
    : `I checked ${identifier} on TrustNaija and it appears to be safe. You can trust this identifier!`;

  const handleShare = (platform: 'whatsapp' | 'twitter' | 'telegram') => {
    let shareLink = '';

    switch (platform) {
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${description}\n\n${shareUrl}`)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${title}\n\n${description}`)}`;
        break;
    }

    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Share Your Findings:</span>
        </div>
        <div className="flex gap-3">
          {/* WhatsApp */}
          <button
            onClick={() => handleShare('whatsapp')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 transition-colors"
            title="Share on WhatsApp"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-1.53.875-2.747 2.12-3.51 3.637C2.924 10.975 2.5 13.02 2.5 15.12c0 1.108.154 2.213.46 3.29l-1.457 4.385 4.687-1.455c1.084.598 2.31.929 3.645.929h.003c5.415 0 9.82-4.405 9.82-9.82 0-2.612-1.02-5.067-2.87-6.917-1.85-1.85-4.305-2.87-6.917-2.87" />
            </svg>
            WhatsApp
          </button>

          {/* Twitter */}
          <button
            onClick={() => handleShare('twitter')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 transition-colors"
            title="Share on Twitter"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9-1 9-5.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
            </svg>
            Twitter
          </button>

          {/* Telegram */}
          <button
            onClick={() => handleShare('telegram')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 transition-colors"
            title="Share on Telegram"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.33-.373-.117l-6.869 4.332-2.97-.924c-.644-.213-.658-.644.135-.954l11.593-4.47c.538-.196 1.006.128.832 1.042z" />
            </svg>
            Telegram
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
        💡 Help protect others by sharing your scam findings on social media
      </p>
    </div>
  );
}
