import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const account = await prisma.account.findUnique({ where: { username } });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const notes = await prisma.accountNote.findMany({
    where: { accountPk: account.pk },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const account = await prisma.account.findUnique({ where: { username } });

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
      accountPk: account.pk,
      content,
      createdAt: new Date().toISOString(),
    },
  });

  return NextResponse.json(note, { status: 201 });
}
