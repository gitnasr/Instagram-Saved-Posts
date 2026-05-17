import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, accountNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ username: string; noteId: string }> }
) {
  const { username, noteId } = await params;
  const id = parseInt(noteId);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
  }

  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .get();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const deleted = db
    .delete(accountNotes)
    .where(and(eq(accountNotes.id, id), eq(accountNotes.accountPk, account.pk)))
    .returning()
    .get();

  if (!deleted) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
