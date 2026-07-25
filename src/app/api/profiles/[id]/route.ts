import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

async function findProfile(id: string) {
  try {
    return await prisma.profile.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await findProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Prisma.ProfileUpdateInput = {};

  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    const clash = await prisma.profile.findUnique({ where: { name } });
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { error: "A profile with that name already exists" },
        { status: 409 }
      );
    }
    updates.name = name;
  }
  if ("cookie" in body) {
    updates.instagramCookie =
      typeof body.cookie === "string" && body.cookie.trim()
        ? body.cookie.trim()
        : null;
  }
  if ("userAgent" in body) {
    updates.userAgent =
      typeof body.userAgent === "string" && body.userAgent.trim()
        ? body.userAgent.trim()
        : null;
  }
  if ("avatarUrl" in body) {
    updates.avatarUrl =
      typeof body.avatarUrl === "string" && body.avatarUrl.trim()
        ? body.avatarUrl.trim()
        : null;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date().toISOString();
    await prisma.profile.update({ where: { id }, data: updates });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await findProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Cascade-delete every collection scoped to this profile.
  const where = { profileId: id };
  await Promise.all([
    prisma.post.deleteMany({ where }),
    prisma.carouselMedia.deleteMany({ where }),
    prisma.accountNote.deleteMany({ where }),
    prisma.accountStatusHistory.deleteMany({ where }),
    prisma.accountUsernameHistory.deleteMany({ where }),
    prisma.accountEvent.deleteMany({ where }),
    prisma.scrapeRun.deleteMany({ where }),
    prisma.account.deleteMany({ where }),
  ]);
  await prisma.profile.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
