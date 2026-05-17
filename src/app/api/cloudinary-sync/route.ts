import { NextResponse } from "next/server";
import {
  runCloudinarySync,
  getCurrentSyncState,
} from "@/lib/cloudinary-sync";
import { getCloudinaryConfig, isCloudinaryConfigured } from "@/lib/cloudinary";

export async function POST() {
  if (!isCloudinaryConfigured(getCloudinaryConfig())) {
    return NextResponse.json(
      { error: "Cloudinary credentials are not configured." },
      { status: 400 }
    );
  }
  try {
    // Fire and forget — sync runs in background
    runCloudinarySync().catch(() => {
      // Error is captured in currentSyncState
    });
    return NextResponse.json({ status: "started" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const current = getCurrentSyncState();
  const configured = isCloudinaryConfigured(getCloudinaryConfig());
  return NextResponse.json({ current, configured });
}
