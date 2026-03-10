/**
 * Meta Tags API Client
 * 
 * Handles dynamic meta tag generation for social sharing and SEO.
 * Implements proper error handling and caching.
 */

interface MetaResponse {
  identifier: string;
  identifier_type: string;
  risk_score: number;
  risk_level: string;
  report_count: number;
  is_known: boolean;
  og_title: string;
  og_description: string;
  og_image: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

// Simple in-memory cache with TTL
const metaCache = new Map<
  string,
  { data: MetaResponse; timestamp: number }
>();

/**
 * Fetch meta tags for an identifier
 * 
 * @param identifier - The identifier to fetch meta tags for
 * @returns MetaResponse with all SEO and social media tags
 */
export async function fetchMeta(identifier: string): Promise<MetaResponse> {
  // Check cache first
  const cached = metaCache.get(identifier);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${API_BASE}/meta?identifier=${encodeURIComponent(identifier)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Meta fetch failed: ${response.statusText}`);
    }

    const data = await response.json() as MetaResponse;

    // Cache the result
    metaCache.set(identifier, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error('Error fetching meta tags:', error);
    throw error;
  }
}

/**
 * Update HTML meta tags dynamically
 * Useful for client-side routing where page title/description changes
 * 
 * @param meta - MetaResponse containing all tag data
 * @param baseUrl - Base URL for canonical and OG tags
 */
export function updateMetaTags(meta: MetaResponse, baseUrl: string = ''): void {
  // Update document title
  document.title = meta.og_title;

  // Update or create meta tags
  updateMetaTag('description', meta.og_description);
  updateMetaTag('og:title', meta.og_title, 'property');
  updateMetaTag('og:description', meta.og_description, 'property');
  updateMetaTag('og:image', meta.og_image, 'property');
  updateMetaTag('og:url', `${baseUrl}?identifier=${encodeURIComponent(meta.identifier)}`, 'property');
  updateMetaTag('twitter:title', meta.og_title, 'name');
  updateMetaTag('twitter:description', meta.og_description, 'name');
  updateMetaTag('twitter:image', meta.og_image, 'name');
}

/**
 * Helper to update or create a meta tag
 * 
 * @param name - The name or property of the meta tag
 * @param content - The content value
 * @param attribute - Whether to use 'name' or 'property' attribute
 */
function updateMetaTag(
  name: string,
  content: string,
  attribute: 'name' | 'property' = 'name'
): void {
  let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }

  meta.content = content;
}

/**
 * Generate share URLs for social platforms
 * 
 * @param meta - MetaResponse data
 * @param pageUrl - Full URL to the page
 * @returns Object with social share URLs
 */
export function generateShareUrls(
  meta: MetaResponse,
  pageUrl: string
): {
  facebook: string;
  twitter: string;
  whatsapp: string;
  linkedin: string;
} {
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTitle = encodeURIComponent(meta.og_title);
  const encodedDesc = encodeURIComponent(meta.og_description);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=TrustNaija`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
}

/**
 * Get risk level color for UI display
 * 
 * @param riskLevel - Risk level string (LOW, MEDIUM, HIGH, CRITICAL)
 * @returns Tailwind color class
 */
export function getRiskLevelColor(
  riskLevel: string
): string {
  const levelMap: { [key: string]: string } = {
    LOW: 'text-green-600',
    MEDIUM: 'text-yellow-600',
    HIGH: 'text-red-600',
    CRITICAL: 'text-red-900',
  };

  return levelMap[riskLevel] || 'text-gray-600';
}

/**
 * Get risk level emoji for display
 * 
 * @param riskLevel - Risk level string
 * @returns Emoji representation
 */
export function getRiskLevelEmoji(
  riskLevel: string
): string {
  const emojiMap: { [key: string]: string } = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🔴',
    CRITICAL: '⛔',
  };

  return emojiMap[riskLevel] || '⚪';
}

/**
 * Format risk score for display
 * 
 * @param score - Risk score (0-100)
 * @returns Formatted string with percentage
 */
export function formatRiskScore(score: number): string {
  return `${Math.round(score)}/100`;
}
