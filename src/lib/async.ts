/**
 * Tiny async primitives shared across the scraper and the Cloudinary sync.
 * Both loops need to pace themselves between requests, and each used to carry
 * its own identical copy of `delay`.
 */

/** Resolve after `ms` milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
