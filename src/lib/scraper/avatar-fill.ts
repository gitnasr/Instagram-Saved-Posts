/**
 * Best-effort backfill of the profile owner's own avatar from the logged-in
 * Instagram account.
 *
 * Kept apart from `run-lifecycle` because the page loop calls this on success
 * and `run-lifecycle` imports the page loop — housing it there would close an
 * import cycle.
 */

import { prisma } from "../prisma";
import { fetchLoggedInUser } from "../instagram-api";
import { logger } from "../logger";

/** Best-effort: populate a profile's avatar from the logged-in IG account. */
export async function fillProfileAvatarIfNeeded(
  profileId: string,
  cookie: string,
  userAgent?: string
): Promise<void> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { avatarUrl: true },
    });
    if (profile?.avatarUrl) return; // already set

    const user = await fetchLoggedInUser(cookie, userAgent);
    if (!user) return;

    await prisma.profile.update({
      where: { id: profileId },
      data: {
        avatarUrl: user.profilePicUrl,
        igUserPk: user.pk,
        igUsername: user.username || null,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.warn({ err, profileId }, "[scraper] Avatar auto-fill failed");
  }
}
