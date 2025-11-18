/**
 * Generates a proxied image URL to bypass referrer/CORS restrictions
 * @param originalUrl - The original image URL
 * @returns Proxied URL or original URL if invalid
 */
export function getProxiedImageUrl(originalUrl: string | null | undefined): string {
  if (!originalUrl) return '';

  // If it's a relative URL or local URL, return as-is
  if (originalUrl.startsWith('/') || originalUrl.startsWith('data:')) {
    return originalUrl;
  }

  try {
    // Validate it's a proper URL
    new URL(originalUrl);

    // Return proxied URL
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  } catch {
    // If URL is invalid, return empty string
    return '';
  }
}

/**
 * Gets the original URL from a proxied URL or returns the URL as-is
 * @param url - Potentially proxied URL
 * @returns Original image URL
 */
export function getOriginalImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  try {
    // Check if it's a proxy URL
    if (url.startsWith('/api/image-proxy?url=')) {
      const params = new URLSearchParams(url.split('?')[1]);
      return params.get('url') || '';
    }
    return url;
  } catch {
    return url;
  }
}
