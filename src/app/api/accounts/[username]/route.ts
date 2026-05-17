import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  accountStatusHistory,
  accountUsernameHistory,
  accounts,
  posts,
  settings,
} from "@/db/schema";
import {
  EXISTS_ALSO_OPTIONS_SETTING_KEY,
  normalizeDateInput,
  normalizeOptionalText,
  parseReusableExistsAlsoOptions,
} from "@/lib/account-metadata";
import { eq, desc, sql } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const body = await request.json();

  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .get();

  if (!account) {
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const updates: Partial<typeof accounts.$inferInsert> = {};

  if ("notes" in body) {
    const nextNotes = normalizeOptionalText(body.notes);

    if (body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json(
        { error: "notes must be a string or null" },
        { status: 400 }
      );
    }

    updates.notes = nextNotes;
  }

  if ("lastScrapeOn" in body) {
    if (body.lastScrapeOn !== null && typeof body.lastScrapeOn !== "string") {
      return NextResponse.json(
        { error: "lastScrapeOn must be a date string or null" },
        { status: 400 }
      );
    }

    if (body.lastScrapeOn === null) {
      updates.lastScrapeOn = null;
    } else {
      const nextLastScrapeOn = normalizeDateInput(body.lastScrapeOn);
      if (!nextLastScrapeOn) {
        return NextResponse.json(
          { error: "lastScrapeOn must use YYYY-MM-DD format" },
          { status: 400 }
        );
      }

      updates.lastScrapeOn = nextLastScrapeOn;
    }
  }

  if ("accountStatus" in body) {
    if (body.accountStatus !== null && typeof body.accountStatus !== "string") {
      return NextResponse.json(
        { error: "accountStatus must be a string or null" },
        { status: 400 }
      );
    }

    const nextStatus = normalizeOptionalText(body.accountStatus);
    updates.accountStatus = nextStatus;
    if (account.accountStatus !== nextStatus) {
      updates.statusChangedAt = nextStatus ? now : null;

      if (nextStatus) {
        db.insert(accountStatusHistory)
          .values({
            accountPk: account.pk,
            status: nextStatus,
            changedAt: now,
          })
          .run();
      }
    }
  }

  let reusableExistsAlsoOptions = parseReusableExistsAlsoOptions(
    db
      .select()
      .from(settings)
      .where(eq(settings.key, EXISTS_ALSO_OPTIONS_SETTING_KEY))
      .get()?.value
  );

  if ("existsAlso" in body || "newExistsAlsoOption" in body) {
    if (body.existsAlso !== undefined && body.existsAlso !== null && typeof body.existsAlso !== "string") {
      return NextResponse.json(
        { error: "existsAlso must be a string or null" },
        { status: 400 }
      );
    }

    if (
      body.newExistsAlsoOption !== undefined &&
      body.newExistsAlsoOption !== null &&
      typeof body.newExistsAlsoOption !== "string"
    ) {
      return NextResponse.json(
        { error: "newExistsAlsoOption must be a string or null" },
        { status: 400 }
      );
    }

    let nextExistsAlso =
      "existsAlso" in body ? normalizeOptionalText(body.existsAlso) : undefined;
    const nextNewExistsAlsoOption = normalizeOptionalText(body.newExistsAlsoOption);

    if (nextNewExistsAlsoOption) {
      nextExistsAlso = nextNewExistsAlsoOption;
    }

    if (typeof nextExistsAlso !== "undefined") {
      updates.existsAlso = nextExistsAlso;

      if (
        nextExistsAlso &&
        !reusableExistsAlsoOptions.some(
          (option) => option.toLocaleLowerCase() === nextExistsAlso.toLocaleLowerCase()
        )
      ) {
        reusableExistsAlsoOptions = parseReusableExistsAlsoOptions(
          JSON.stringify([...reusableExistsAlsoOptions, nextExistsAlso])
        );
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    db.update(accounts)
      .set(updates)
      .where(eq(accounts.pk, account.pk))
      .run();
  }

  if ("existsAlso" in body || "newExistsAlsoOption" in body) {
    db.insert(settings)
      .values({
        key: EXISTS_ALSO_OPTIONS_SETTING_KEY,
        value: JSON.stringify(reusableExistsAlsoOptions),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify(reusableExistsAlsoOptions),
          updatedAt: now,
        },
      })
      .run();
  }

  return NextResponse.json({ success: true });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "24");
  const offset = (page - 1) * limit;

  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .get();

  if (!account) {
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404 }
    );
  }

  const accountPosts = db
    .select()
    .from(posts)
    .where(eq(posts.accountPk, account.pk))
    .orderBy(desc(posts.takenAt))
    .limit(limit)
    .offset(offset)
    .all();

  const totalResult = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(posts)
    .where(eq(posts.accountPk, account.pk))
    .get();

  const total = totalResult?.count ?? 0;
  const existsAlsoOptions = parseReusableExistsAlsoOptions(
    db
      .select()
      .from(settings)
      .where(eq(settings.key, EXISTS_ALSO_OPTIONS_SETTING_KEY))
      .get()?.value
  );
  const statusHistory = db
    .select()
    .from(accountStatusHistory)
    .where(eq(accountStatusHistory.accountPk, account.pk))
    .orderBy(desc(accountStatusHistory.changedAt))
    .all();
  const usernameHistory = db
    .select()
    .from(accountUsernameHistory)
    .where(eq(accountUsernameHistory.accountPk, account.pk))
    .orderBy(desc(accountUsernameHistory.changedAt))
    .all();

  return NextResponse.json({
    account,
    existsAlsoOptions,
    statusHistory,
    usernameHistory,
    posts: accountPosts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
