import { NextResponse } from "next/server";
import { resumeScrape } from "@/lib/scraper";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function POST(request: Request) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  try {
    const { runId } = await request.json();
    if (!runId || typeof runId !== "number") {
      return NextResponse.json(
        { error: "runId is required and must be a number" },
        { status: 400 }
      );
    }
    await resumeScrape(profile.id, runId);
    return NextResponse.json({ runId, status: "resumed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
