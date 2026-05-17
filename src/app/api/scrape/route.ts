import { NextResponse } from "next/server";
import { runScrape, getCurrentScrapeState, detectAndMarkInterruptedRuns } from "@/lib/scraper";
import { db } from "@/db";
import { scrapeRuns } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function POST() {
  try {
    const runId = await runScrape();
    return NextResponse.json({ runId, status: "started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  // Detect any runs that were "running" when the server restarted
  detectAndMarkInterruptedRuns();

  const currentState = getCurrentScrapeState();
  const history = db
    .select()
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(20)
    .all();

  return NextResponse.json({ current: currentState, history });
}
