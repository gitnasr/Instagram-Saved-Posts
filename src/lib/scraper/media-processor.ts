/**
 * Processes one saved post from the feed: account first, then the post and its
 * carousel, then a single timeline write.
 *
 * This is the only place that owns both halves, so it is also where the run
 * counters are advanced — `account-sync` and `post-sync` stay pure of them.
 */

import { recordAccountEvents } from "../account-events";
import type { InstagramMedia } from "@/types/instagram";
import { syncAccountFromMedia } from "./account-sync";
import { syncPostFromMedia } from "./post-sync";
import type { Runtime } from "./types";

export async function processMediaItem(
  runtime: Runtime,
  media: InstagramMedia
): Promise<void> {
  const { runId, profileId } = runtime.state;
  const now = new Date().toISOString();
  const accountPkStr = String(media.user.pk);

  const account = await syncAccountFromMedia(
    {
      runId,
      profileId,
      profilePicHashCache: runtime.profilePicHashCache,
    },
    media,
    now
  );

  if (account.isNewAccount) runtime.state.newAccountsFound += 1;
  if (account.usernameChangedPk) {
    runtime.usernameChanges.add(account.usernameChangedPk);
  }

  const post = await syncPostFromMedia(profileId, runId, media, now);
  if (post.isNewPost) runtime.state.newPostsAdded += 1;

  // Timeline entries collected across the account and post branches, then
  // written once at the end of this media item.
  await recordAccountEvents(
    profileId,
    accountPkStr,
    [...account.events, ...post.events],
    runId
  );
}
