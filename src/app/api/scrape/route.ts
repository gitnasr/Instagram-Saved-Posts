import { NextResponse } from "next/server";
import {
  runScrape,
  getCurrentScrapeState,
  detectAndMarkInterruptedRuns,
} from "@/lib/scraper";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function POST() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  try {
    const runId = await runScrape(profile.id);
    return NextResponse.json({ runId, status: "started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  // Detect any runs that were "running" when the server restarted
  await detectAndMarkInterruptedRuns(profile.id);

  const currentState = getCurrentScrapeState(profile.id);
  const history = await prisma.scrapeRun.findMany({
    where: { profileId: profile.id },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ current: currentState, history });
}
