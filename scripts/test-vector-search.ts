/**
 * Self-check for the pure vector-search logic. Run: npm run test:vectors
 * Covers the parts that silently return wrong results if they break —
 * point ids (re-index would duplicate instead of upsert), score calibration,
 * and the higher-is-better normalisation shared by all three search modes.
 */
import assert from "assert";
import { pointId } from "../src/lib/vector/qdrant-client";
import { bestHitPerPost, calibrate } from "../src/lib/vector/search-api";

// pointId must be a stable UUIDv5 — these vectors were verified against the
// `uuid` package's v5() before that dependency was dropped.
assert.equal(pointId("p", "1", "thumbnail", 0), "bdf94c6f-29ce-5542-870a-9eda13efc726");
assert.equal(pointId("p", "1", "carousel", 3, 2), "37c303b0-0e07-5438-a850-27c6443f5fce");
assert.equal(pointId("p", "1", "carousel", 3, 0), pointId("p", "1", "carousel", 3, 0));
assert.notEqual(pointId("p", "1", "carousel", 3, 0), pointId("p", "1", "carousel", 3, 1));
assert.notEqual(pointId("p", "1", "carousel", 3), pointId("p", "1", "carousel", 3, 3));

// calibrate clamps at both ends and is monotonically increasing in between.
assert.equal(calibrate(0.1, 0.2, 0.4, 0.45, 0.95), 0.45);
assert.equal(calibrate(0.9, 0.2, 0.4, 0.45, 0.95), 0.95);
assert.equal(calibrate(0.3, 0.2, 0.4, 0.45, 0.95), 0.7);
assert.ok(calibrate(0.35, 0.2, 0.4, 0.45, 0.95) > calibrate(0.25, 0.2, 0.4, 0.45, 0.95));

const hit = (postPk: string, score: number, carouselPosition?: number) => ({
  score,
  payload: { postPk, carouselPosition, imageUrl: `${postPk}-${carouselPosition ?? 0}.jpg` },
});

// Cosine (higher is better): keeps the best slide per post, drops sub-floor noise.
const cosine = bestHitPerPost(
  [hit("a", 0.31, 0), hit("a", 0.45, 2), hit("b", 0.1, 0), hit("c", 0.28, 1)],
  (s) => (s >= 0.26 ? s : null)
);
assert.deepEqual([...cosine.keys()].sort(), ["a", "c"]);
assert.equal(cosine.get("a")!.quality, 0.45);
assert.equal(cosine.get("a")!.carouselPosition, 2);
assert.equal(cosine.get("a")!.imageUrl, "a-2.jpg");

// Euclid (lower is better): the closest face must win, and anything past the
// identity threshold must be dropped — an inverted comparison here would rank
// strangers above the actual person.
const THRESHOLD = 0.62;
const faces = bestHitPerPost(
  [hit("a", 0.55), hit("a", 0.2), hit("b", 0.71)],
  (d) => (d <= THRESHOLD ? THRESHOLD - d : null)
);
assert.deepEqual([...faces.keys()], ["a"]);
assert.equal(Number(faces.get("a")!.quality.toFixed(2)), 0.42); // from distance 0.2, the closer match

// Hits without a usable postPk payload are ignored rather than crashing.
assert.equal(bestHitPerPost([{ score: 0.9, payload: null }], (s) => s).size, 0);

console.log("vector search self-check: all assertions passed");
