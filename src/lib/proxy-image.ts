/**
 * Returns a URL for displaying an Instagram/Facebook CDN image.
 * - Cloudinary URLs are returned as-is (permanent storage).
 * - All other URLs are routed through /api/proxy-image so the browser
 *   request goes to our server rather than directly to Instagram CDN,
 *   which avoids CORS and auth issues.
 * - Returns undefined for null/empty values.
 */
export function proxyImageUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) return undefined;
  if (url.includes("cloudinary.com")) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}
