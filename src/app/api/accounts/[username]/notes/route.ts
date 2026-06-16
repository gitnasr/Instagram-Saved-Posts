import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { username } = await params;

  const account = await prisma.account.findFirst({
    where: { profileId: profile.id, username },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const notes = await prisma.accountNote.findMany({
    where: { profileId: profile.id, accountPk: account.pk },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { username } = await params;

  const account = await prisma.account.findFirst({
    where: { profileId: profile.id, username },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await request.json();
  const content = String(body.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const note = await prisma.accountNote.create({
    data: {
      profileId: profile.id,
      accountPk: account.pk,
      content,
      createdAt: new Date().toISOString(),
    },
  });

  return NextResponse.json(note, { status: 201 });
}
