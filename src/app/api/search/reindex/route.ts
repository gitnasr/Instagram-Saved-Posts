import { NextResponse } from "next/server";
import { runVectorIndex, getCurrentIndexState } from "@/lib/vector/index-posts";
import { getQdrantConfig, isQdrantConfigured } from "@/lib/vector/qdrant-client";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function POST() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  if (!isQdrantConfigured(getQdrantConfig())) {
    return NextResponse.json(
      { error: "Vector search is not configured. Set QDRANT_URL env var." },
      { status: 400 }
    );
  }
  try {
    // Fire and forget — index run happens in background
    runVectorIndex(profile.id).catch(() => {
      // Error is captured in the profile's index state
    });
    return NextResponse.json({ status: "started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const current = getCurrentIndexState(profile.id);
  const configured = isQdrantConfigured(getQdrantConfig());
  return NextResponse.json({ current, configured });
}
