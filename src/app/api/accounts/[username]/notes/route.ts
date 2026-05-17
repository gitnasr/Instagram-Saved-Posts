import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, accountNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .get();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const notes = db
    .select()
    .from(accountNotes)
    .where(eq(accountNotes.accountPk, account.pk))
    .orderBy(desc(accountNotes.createdAt))
    .all();

  return NextResponse.json(notes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .get();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await request.json();
  const content = String(body.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const note = db
    .insert(accountNotes)
    .values({
      accountPk: account.pk,
      content,
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();

  return NextResponse.json(note, { status: 201 });
}
