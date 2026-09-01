import { NextResponse } from "next/server";
import { fetchLoggedInUser } from "@/lib/instagram-api";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cookie = typeof body.cookie === "string" ? body.cookie.trim() : "";
    const userAgent = typeof body.userAgent === "string" ? body.userAgent.trim() : undefined;

    if (!cookie) {
      return NextResponse.json(
        { valid: false, error: "Cookie string is required" },
        { status: 400 }
      );
    }

    if (!cookie.includes("ds_user_id=") && !cookie.includes("sessionid=")) {
      return NextResponse.json(
        {
          valid: false,
          error: "Cookie must contain at least 'sessionid' and 'ds_user_id'.",
        },
        { status: 400 }
      );
    }

    const user = await fetchLoggedInUser(cookie, userAgent);

    if (!user) {
      return NextResponse.json(
        {
          valid: false,
          error:
            "Could not authenticate with Instagram. Please ensure the cookie is fresh and valid.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        pk: user.pk,
        username: user.username,
        profilePicUrl: user.profilePicUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to validate cookie";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
