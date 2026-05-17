import { NextResponse } from "next/server";
import {
  runScrape,
  getCurrentScrapeState,
  detectAndMarkInterruptedRuns,
} from "@/lib/scraper";
import { prisma } from "@/lib/prisma";

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
  await detectAndMarkInterruptedRuns();

  const currentState = getCurrentScrapeState();
  const history = await prisma.scrapeRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ current: currentState, history });
}
