import type { Account, AccountEventType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { InstagramUser } from "@/types/instagram";

/**
 * A timeline entry before it is bound to a profile/account/run. Produced by the
 * diff helpers below and handed to `recordAccountEvents` for a single write.
 */
export interface AccountEventDraft {
  type: AccountEventType;
  occurredAt: string;
  fromValue?: string | null;
  toValue?: string | null;
  metadata?: string | null;
}

/**
 * Append timeline entries for one account. No-ops on an empty list so callers
 * can pass a diff result straight through without guarding.
 */
export async function recordAccountEvents(
  profileId: string,
  accountPk: string,
  events: AccountEventDraft[],
  scrapeRunId?: number | null
): Promise<void> {
  if (events.length === 0) return;

  await prisma.accountEvent.createMany({
    data: events.map((event) => ({
      profileId,
      accountPk,
      type: event.type,
      occurredAt: event.occurredAt,
      fromValue: event.fromValue ?? null,
      toValue: event.toValue ?? null,
      metadata: event.metadata ?? null,
      scrapeRunId: scrapeRunId ?? null,
    })),
  });
}

/**
 * Append the same event to many accounts at once (bulk ignore/un-ignore).
 */
export async function recordBulkAccountEvents(
  profileId: string,
  accountPks: string[],
  type: AccountEventType,
  occurredAt: string
): Promise<void> {
  if (accountPks.length === 0) return;

  await prisma.accountEvent.createMany({
    data: accountPks.map((accountPk) => ({
      profileId,
      accountPk,
      type,
      occurredAt,
    })),
  });
}

/**
 * Compare a stored account against the fresh scrape payload and emit one entry
 * per changed field. Returns `[]` when nothing moved, which is the common case,
 * so an unchanged account costs zero writes.
 *
 * Privacy is derived from the `isPrivate` boolean rather than the free-text
 * `accountStatus` column: that column is shared with user-chosen statuses like
 * "Blocked", and it only ever recorded the public→private direction.
 */
export function diffAccountForEvents(
  existing: Account,
  incoming: InstagramUser,
  hashChanged: boolean,
  occurredAt: string
): AccountEventDraft[] {
  const events: AccountEventDraft[] = [];

  if (existing.username !== incoming.username) {
    events.push({
      type: "username_changed",
      occurredAt,
      fromValue: existing.username,
      toValue: incoming.username,
    });
  }

  if ((existing.fullName ?? "") !== (incoming.full_name ?? "")) {
    events.push({
      type: "full_name_changed",
      occurredAt,
      fromValue: existing.fullName,
      toValue: incoming.full_name,
    });
  }

  if (existing.isPrivate !== incoming.is_private) {
    events.push({
      type: incoming.is_private ? "privacy_private" : "privacy_public",
      occurredAt,
    });
  }

  if (existing.isVerified !== incoming.is_verified) {
    events.push({
      type: incoming.is_verified ? "verified_gained" : "verified_lost",
      occurredAt,
    });
  }

  // Only meaningful once a hash has been stored — the first hash we ever
  // compute for an account is not a "change".
  if (hashChanged && existing.profilePicHash) {
    events.push({ type: "profile_pic_changed", occurredAt });
  }

  return events;
}

/** Newest-first timeline for one account. */
export function accountEventsQuery(
  profileId: string,
  accountPk: string,
  take: number
): Prisma.AccountEventFindManyArgs {
  return {
    where: { profileId, accountPk },
    orderBy: { occurredAt: "desc" },
    take,
  };
}
