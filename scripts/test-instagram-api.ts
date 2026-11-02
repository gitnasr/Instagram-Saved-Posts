// Self-check for src/lib/instagram-api.ts. Run: npx tsx scripts/test-instagram-api.ts
import assert from "node:assert/strict";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { classifyScrapeError, fetchLoggedInUser, fetchSavedPostsPage } from "../src/lib/instagram-api";
import { extractErrorInfo } from "../src/lib/scraper/errors";
import { prisma } from "../src/lib/prisma";
import { syncPostFromMedia } from "../src/lib/scraper/post-sync";
import type { InstagramMedia } from "../src/types/instagram";

let seen: InternalAxiosRequestConfig[] = [];
const respondWith = (data: unknown) => {
  seen = [];
  axios.defaults.adapter = async (config) => {
    seen.push(config);
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
};
const cookie = "sessionid=abc; ds_user_id=42; csrftoken=tok123; mid=x";
const failure = async (data: unknown) => {
  respondWith(data);
  return fetchSavedPostsPage({ cookie }).then(
    () => assert.fail("expected a failure"),
    (e: unknown) => e
  );
};

async function main() {
  // Request shape
  respondWith({ status: "ok", items: [], num_results: 0, more_available: false });
  await fetchSavedPostsPage({ cookie, maxId: "cur" });
  const url = new URL(seen[0].url!);
  assert.equal(url.origin + url.pathname, "https://www.instagram.com/api/v1/feed/saved/posts/");
  assert.equal(url.searchParams.get("max_id"), "cur");
  assert.equal(seen[0].headers.get("X-IG-App-ID"), "936619743392459");
  assert.equal(seen[0].headers.get("X-CSRFToken"), "tok123");
  assert.equal(seen[0].headers.get("Cookie"), cookie);
  assert.match(String(seen[0].headers.get("User-Agent")), /Chrome/);

  // No csrftoken in the cookie: header left out, custom user agent respected
  await fetchSavedPostsPage({ cookie: "sessionid=abc", userAgent: "custom" });
  assert.equal(seen[1].headers.get("X-CSRFToken"), undefined);
  assert.equal(seen[1].headers.get("User-Agent"), "custom");

  // A 200 failure keeps Instagram's reason and body through the retry wrapper
  const fail = await failure({ status: "fail", message: "something new" });
  assert.equal(classifyScrapeError(fail), "fatal");
  const info = extractErrorInfo(fail);
  assert.equal(info.errorMsg, "Instagram API returned status: fail (something new)");
  assert.equal(info.errorBody, '{"status":"fail","message":"something new"}');
  assert.equal(seen.length, 1);

  // Classification of 200 failures
  assert.equal(classifyScrapeError(await failure({ status: "fail", message: "challenge_required" })), "auth");
  assert.equal(classifyScrapeError(await failure({ status: "fail", message: "login_required" })), "auth");

  // Dead session on the web host: HTML login page with a 200, body capped
  const page = await failure(`<html>${"x".repeat(5000)}</html>`);
  assert.equal(classifyScrapeError(page), "auth");
  assert.equal(extractErrorInfo(page).errorBody?.length, 2000);

  // Avatar lookup uses the same host and headers
  respondWith({ user: { pk: 42, username: "me", profile_pic_url: "p" } });
  assert.deepEqual(await fetchLoggedInUser(cookie), { pk: "42", username: "me", profilePicUrl: "p" });
  assert.equal(seen[0].url, "https://www.instagram.com/api/v1/users/42/info/");
  assert.equal(seen[0].headers.get("X-IG-App-ID"), "936619743392459");

  // A post stored with a rounded pk matches its exact web pk instead of duplicating
  const rows = [{ id: "a", pk: "3489599198812897300", thumbnailUrl: null }];
  let created = 0;
  Object.defineProperty(prisma, "post", {
    value: {
      findFirst: async ({ where }: { where: { pk: { in: string[] } } }) =>
        rows.find((r) => where.pk.in.includes(r.pk)) ?? null,
      update: async () => rows[0],
      create: async () => (created += 1),
    },
  });
  const media = (pk: number | string) =>
    ({ pk, id: `${pk}_1`, code: "c", user: { pk: "1" } }) as unknown as InstagramMedia;
  const oldPost = await syncPostFromMedia("p", 1, media("3489599198812897070"), "t");
  assert.equal(oldPost.isNewPost, false);
  assert.equal(created, 0);
  // A post we have never seen keeps its exact pk
  const newPost = await syncPostFromMedia("p", 1, media("3700000000000000123"), "t");
  assert.equal(newPost.isNewPost, true);
  assert.equal(created, 1);
  assert.match(newPost.events[0].metadata ?? "", /3700000000000000123/);

  console.log("instagram-api ok");
}

void main();
