import { NextResponse } from "next/server";
import {
  runCloudinarySync,
  getCurrentSyncState,
} from "@/lib/cloudinary-sync";
import { getCloudinaryConfig, isCloudinaryConfigured } from "@/lib/cloudinary";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function POST() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  if (!isCloudinaryConfigured(getCloudinaryConfig())) {
    return NextResponse.json(
      { error: "Cloudinary credentials are not configured." },
      { status: 400 }
    );
  }
  try {
    // Fire and forget — sync runs in background
    runCloudinarySync(profile.id).catch(() => {
      // Error is captured in the profile's sync state
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

  const current = getCurrentSyncState(profile.id);
  const configured = isCloudinaryConfigured(getCloudinaryConfig());
  return NextResponse.json({ current, configured });
}
