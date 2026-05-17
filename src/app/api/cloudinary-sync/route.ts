import { NextResponse } from "next/server";
import {
  runCloudinarySync,
  getCurrentSyncState,
} from "@/lib/cloudinary-sync";

export async function POST() {
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
  return NextResponse.json({ current });
}
