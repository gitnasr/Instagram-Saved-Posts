/**
 * Public surface of the scraper.
 *
 * The implementation is split across sibling modules; this barrel is what
 * `@/lib/scraper` resolves to, so API routes and `instrumentation.ts` keep
 * importing exactly what they always did. Nothing else here is public.
 */

export type { ScrapeProgress } from "./types";
export {
  getCurrentScrapeState,
  requestScrapeCancel,
  detectAndMarkInterruptedRuns,
} from "./runtime-registry";
export { runScrape, resumeScrape } from "./run-lifecycle";
