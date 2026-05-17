import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ username: string; noteId: string }> }
) {
  const { username, noteId } = await params;

  if (!noteId) {
    return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { username } });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const deleted = await prisma.accountNote.deleteMany({
    where: { id: noteId, accountPk: account.pk },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
