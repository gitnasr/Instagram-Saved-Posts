import { NextResponse } from "next/server";
import {
  runCloudinarySync,
  getCurrentSyncState,
} from "@/lib/cloudinary-sync";
import {
  getCloudinaryConfigFromDB,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function POST() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const config = await getCloudinaryConfigFromDB();
  if (!isCloudinaryConfigured(config)) {
    return NextResponse.json(
      { error: "Cloudinary credentials are not configured. Add them in Settings → Cloudinary." },
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
  const config = await getCloudinaryConfigFromDB();
  const configured = isCloudinaryConfigured(config);
  return NextResponse.json({ current, configured });
}
