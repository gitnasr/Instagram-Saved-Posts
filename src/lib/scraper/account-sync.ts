/**
 * Everything the scraper writes about an *account* when a saved post is seen:
 * the upsert itself, username history, and the timeline events that fall out
 * of the diff. Privacy lives on the `isPrivate` flag and is only ever *recorded*
 * as timeline events (`privacy_private` / `privacy_public`) — the free-text
 * `accountStatus` column is left to the user and the lost/recovered flow.
 *
 * Deliberately free of `Runtime`. It reports what changed and lets the caller
 * update the run counters, which is what keeps run state out of persistence.
 */

import { prisma } from "../prisma";
import { diffAccountForEvents, type AccountEventDraft } from "../account-events";
import { logger } from "../logger";
import type { InstagramMedia } from "@/types/instagram";
import { hashImageUrl } from "./image-hash";
import type { MediaItemContext } from "./types";

async function recordUsernameChange(
  profileId: string,
  {
    accountPk,
    oldUsername,
    newUsername,
    runId,
    changedAt,
  }: {
    accountPk: string;
    oldUsername: string;
    newUsername: string;
    runId: number;
    changedAt: string;
  }
) {
  await prisma.accountUsernameHistory.create({
    data: {
      profileId,
      accountPk,
      oldUsername,
      newUsername,
      scrapeRunId: runId,
      changedAt,
    },
  });

  logger.info(
    { accountPk, oldUsername, newUsername },
    "[scraper] Account username changed"
  );
}

/**
 * Resolve the avatar hash for an account, reusing this run's cache.
 *
 * The same account appears once per saved post, and re-downloading its avatar
 * every time is what got us rate-limited.
 */
async function resolveProfilePicHash(
  ctx: MediaItemContext,
  accountPk: string,
  profilePicUrl: string | null | undefined
): Promise<string | null> {
  if (!profilePicUrl) return null;
  if (ctx.profilePicHashCache.has(accountPk)) {
    return ctx.profilePicHashCache.get(accountPk) ?? null;
  }
  const hash = await hashImageUrl(profilePicUrl);
  ctx.profilePicHashCache.set(accountPk, hash);
  return hash;
}

interface AccountSyncResult {
  events: AccountEventDraft[];
  isNewAccount: boolean;
  /** The account's pk when its username changed this item, else null. */
  usernameChangedPk: string | null;
}

/** Create or refresh the account behind a saved post. */
export async function syncAccountFromMedia(
  ctx: MediaItemContext,
  media: InstagramMedia,
  now: string
): Promise<AccountSyncResult> {
  const { runId, profileId } = ctx;
  const accountPkStr = String(media.user.pk);

  const existingAccount = await prisma.account.findFirst({
    where: { profileId, pk: accountPkStr },
  });

  // Hash the profile pic to detect changes (kept for hash-change detection).
  const profilePicHash = await resolveProfilePicHash(
    ctx,
    accountPkStr,
    media.user.profile_pic_url
  );

  const hashChanged =
    profilePicHash != null &&
    existingAccount?.profilePicHash !== profilePicHash;

  const events: AccountEventDraft[] = [];
  let usernameChangedPk: string | null = null;

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        profileId,
        pk: accountPkStr,
        username: media.user.username,
        fullName: media.user.full_name,
        isVerified: media.user.is_verified,
        isPrivate: media.user.is_private,
        profilePicUrl: media.user.profile_pic_url,
        profilePicHash,
        cloudinaryProfilePicUrl: null, // Cloudinary sync will handle upload
        savedPostCount: 0,
        firstSeenAt: now,
        lastSeenAt: now,
        discoveredInRunId: runId,
      },
    });

    events.push({ type: "discovered", occurredAt: now });
    if (media.user.is_private) {
      events.push({ type: "privacy_private", occurredAt: now });
    }

    return { events, isNewAccount: true, usernameChangedPk };
  }

  const previousUsername = existingAccount.username;
  const nextUsername = media.user.username;

  // Diff before the update overwrites the stored values, so a change is
  // captured (both privacy directions included) before it is lost.
  events.push(
    ...diffAccountForEvents(existingAccount, media.user, hashChanged, now)
  );

  await prisma.account.update({
    where: { id: existingAccount.id },
    data: {
      username: nextUsername,
      fullName: media.user.full_name,
      isVerified: media.user.is_verified,
      isPrivate: media.user.is_private,
      profilePicUrl: media.user.profile_pic_url, // always refresh CDN URL
      ...(profilePicHash ? { profilePicHash } : {}),
      // If pic changed, null out cloudinary URL so sync re-uploads it
      ...(hashChanged ? { cloudinaryProfilePicUrl: null } : {}),
      lastSeenAt: now,
    },
  });

  if (previousUsername !== nextUsername) {
    await recordUsernameChange(profileId, {
      accountPk: accountPkStr,
      oldUsername: previousUsername,
      newUsername: nextUsername,
      runId,
      changedAt: now,
    });
    usernameChangedPk = accountPkStr;
  }

  return { events, isNewAccount: false, usernameChangedPk };
}
