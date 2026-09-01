export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Runs orphaned by a restart stay "running" — and so stay un-resumable —
    // until someone happens to open the dashboard. Sweep them at boot, while
    // no runtimes are registered yet, so nothing live can be misflagged.
    try {
      const { detectAndMarkInterruptedRuns } = await import("./lib/scraper");
      await detectAndMarkInterruptedRuns();
    } catch (error) {
      const { logger } = await import("./lib/logger");
      logger.warn({ err: error }, "[boot] Interrupted-run sweep failed");
    }
  }
}
