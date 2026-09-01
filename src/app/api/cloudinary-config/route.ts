import { NextRequest, NextResponse } from "next/server";
import {
  getCloudinaryConfigFromDB,
  saveCloudinaryConfigToDB,
  clearCloudinaryConfigFromDB,
  testCloudinaryConnection,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

/**
 * GET /api/cloudinary-config
 * Returns the current Cloudinary configuration status and live usage stats.
 * API secret is masked before being sent to the client.
 */
export async function GET() {
  try {
    const config = await getCloudinaryConfigFromDB();
    const configured = isCloudinaryConfigured(config);

    if (!configured) {
      return NextResponse.json({
        configured: false,
        cloudName: "",
        apiKey: "",
        stats: null,
      });
    }

    const { success, stats, error } = await testCloudinaryConnection(config);

    return NextResponse.json({
      configured: true,
      cloudName: config.cloudName,
      // Never expose the real API key/secret to the client — mask them
      apiKey: config.apiKey ? config.apiKey.slice(0, 6) + "••••••" : "",
      stats: success ? stats : null,
      statsError: !success ? error : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/cloudinary-config
 * Validates the credentials with Cloudinary, then saves them to DB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cloudName, apiKey, apiSecret } = body as {
      cloudName?: string;
      apiKey?: string;
      apiSecret?: string;
    };

    if (!cloudName?.trim() || !apiKey?.trim() || !apiSecret?.trim()) {
      return NextResponse.json(
        { error: "All three fields (Cloud Name, API Key, API Secret) are required." },
        { status: 400 }
      );
    }

    const config = {
      cloudName: cloudName.trim(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
    };

    // Validate credentials before saving
    const { success, stats, error } = await testCloudinaryConnection(config);
    if (!success) {
      return NextResponse.json(
        { error: `Cloudinary validation failed: ${error}` },
        { status: 400 }
      );
    }

    await saveCloudinaryConfigToDB(config);

    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/cloudinary-config
 * Removes Cloudinary credentials from the DB.
 */
export async function DELETE() {
  try {
    await clearCloudinaryConfigFromDB();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
