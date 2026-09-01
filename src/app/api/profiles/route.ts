import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { profileColor } from "@/lib/profile-avatar";
import { fetchLoggedInUser } from "@/lib/instagram-api";

/** Strip secrets; expose only what the UI needs. */
function publicProfile(
  p: {
    id: string;
    name: string;
    avatarUrl: string | null;
    avatarColor: string | null;
    instagramCookie: string | null;
    userAgent: string | null;
    igUsername: string | null;
    createdAt: string;
  },
  activeId: string | null
) {
  return {
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    avatarColor: p.avatarColor,
    igUsername: p.igUsername,
    hasCookie: Boolean(p.instagramCookie),
    hasUserAgent: Boolean(p.userAgent),
    createdAt: p.createdAt,
    isActive: p.id === activeId,
  };
}

export async function GET() {
  const [profiles, activeId] = await Promise.all([
    prisma.profile.findMany({ orderBy: { createdAt: "asc" } }),
    getActiveProfileId(),
  ]);
  return NextResponse.json(profiles.map((p) => publicProfile(p, activeId)));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const cookie = typeof body.cookie === "string" ? body.cookie.trim() : "";
  const userAgent =
    typeof body.userAgent === "string" ? body.userAgent.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.profile.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "A profile with that name already exists" },
      { status: 409 }
    );
  }

  let igUsername: string | null = null;
  let igUserPk: string | null = null;
  let avatarUrl: string | null = null;

  if (cookie) {
    try {
      const igUser = await fetchLoggedInUser(cookie, userAgent || undefined);
      if (igUser) {
        igUsername = igUser.username;
        igUserPk = igUser.pk;
        avatarUrl = igUser.profilePicUrl;
      }
    } catch {
      // Best-effort; continue if fetch fails
    }
  }

  const now = new Date().toISOString();
  const profile = await prisma.profile.create({
    data: {
      name,
      avatarColor: profileColor(name),
      avatarUrl,
      igUsername,
      igUserPk,
      instagramCookie: cookie || null,
      userAgent: userAgent || null,
      lostStateBackfilled: false,
      createdAt: now,
      updatedAt: now,
    },
  });

  return NextResponse.json(publicProfile(profile, null), { status: 201 });
}
