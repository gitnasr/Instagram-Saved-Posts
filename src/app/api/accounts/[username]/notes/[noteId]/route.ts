import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ username: string; noteId: string }> }
) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { username, noteId } = await params;

  if (!noteId) {
    return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { profileId: profile.id, username },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const deleted = await prisma.accountNote.deleteMany({
    where: { id: noteId, profileId: profile.id, accountPk: account.pk },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
