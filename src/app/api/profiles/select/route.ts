import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/active-profile";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const profileId = String(body.profileId ?? "").trim();

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  let profile;
  try {
    profile = await prisma.profile.findUnique({ where: { id: profileId } });
  } catch {
    profile = null;
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const res = NextResponse.json({ success: true, profileId });
  res.cookies.set(ACTIVE_PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
