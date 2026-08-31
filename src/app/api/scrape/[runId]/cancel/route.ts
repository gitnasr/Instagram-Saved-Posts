import { NextResponse } from "next/server";
import { requestScrapeCancel } from "@/lib/scraper";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { runId } = await params;
  const id = parseInt(runId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }

  const result = requestScrapeCancel(profile.id, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // The loop stops after the page in flight, so the run is still "running"
  // for a few seconds; the status poll picks up "cancelled" when it lands.
  return NextResponse.json({ runId: id, status: "cancelling" });
}
