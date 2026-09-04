import { QdrantClient } from "@qdrant/js-client-rest";
import { createHash } from "crypto";

export interface QdrantConfig {
  url: string;
  apiKey?: string;
}

export class VectorIndexNotBuiltError extends Error {
  code = "INDEX_NOT_BUILT";
  constructor(message = "Vector index has not been built yet. Please index your saved posts first.") {
    super(message);
    this.name = "VectorIndexNotBuiltError";
  }
}

/**
 * Qdrant configuration from env vars (QDRANT_URL, QDRANT_API_KEY).
 * Defaults to http://localhost:6335 in development if unset (or http://qdrant:6333 in docker).
 */
export function getQdrantConfig(): QdrantConfig {
  return {
    url: process.env.QDRANT_URL || (process.env.NODE_ENV === "development" ? "http://localhost:6335" : ""),
    apiKey: process.env.QDRANT_API_KEY,
  };
}

export function isQdrantConfigured(config: QdrantConfig = getQdrantConfig()): boolean {
  return !!config.url;
}

/**
 * Browser-reachable Qdrant Dashboard URL. Container-internal hostnames are not
 * reachable from the user's browser, so those need QDRANT_DASHBOARD_URL set
 * explicitly; otherwise this returns "" and the UI hides the link.
 */
function getQdrantDashboardUrl(): string {
  if (process.env.QDRANT_DASHBOARD_URL) return process.env.QDRANT_DASHBOARD_URL;
  const { url } = getQdrantConfig();
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `http://localhost:${parsed.port || process.env.QDRANT_PORT || 6335}/dashboard`;
    }
    if (parsed.hostname === "qdrant") return "";
    return `${url.replace(/\/$/, "")}/dashboard`;
  } catch {
    return "";
  }
}

export const COLLECTIONS = {
  POST_IMAGES: "post_images",
  POST_FACES: "post_faces",
} as const;

const IMAGE_VECTOR_SIZE = 512; // Xenova/clip-vit-base-patch16
const FACE_VECTOR_SIZE = 128; // face-api face recognition descriptor

let client: QdrantClient | null = null;

function getQdrantClient(): QdrantClient {
  if (client) return client;
  const config = getQdrantConfig();
  if (!isQdrantConfigured(config)) {
    throw new Error(
      "Qdrant is not configured. Set QDRANT_URL (and QDRANT_API_KEY) env vars."
    );
  }
  const url = new URL(config.url);
  if (
    config.apiKey &&
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1" &&
    url.hostname !== "qdrant" &&
    !url.hostname.endsWith(".local")
  ) {
    throw new Error(
      "Insecure Qdrant configuration: QDRANT_API_KEY must not be sent over unencrypted HTTP."
    );
  }

  // js-client-rest defaults to port 6333 even when the URL has no explicit
  // port, so an HTTPS URL behind a reverse proxy (Dokploy domain) silently
  // gets the wrong port unless it's set explicitly here.
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  client = new QdrantClient({
    url: config.url,
    apiKey: config.apiKey,
    port,
    checkCompatibility: false,
  });
  return client;
}

/** Counts points in a collection, optionally filtered by profileId. Returns 0 if the collection is missing. */
async function countCollectionPoints(name: string, profileId?: string): Promise<number> {
  try {
    const filter = profileId
      ? { must: [{ key: "profileId", match: { value: profileId } }] }
      : undefined;
    const res = await getQdrantClient().count(name, { filter, exact: true });
    return res.count;
  } catch {
    return 0;
  }
}

export interface QdrantLivenessResult {
  status: "healthy" | "degraded" | "unhealthy" | "disconnected";
  latencyMs: number;
  url: string;
  dashboardUrl: string;
  collections: {
    post_images: { exists: boolean; pointsCount: number };
    post_faces: { exists: boolean; pointsCount: number };
  };
  error?: string;
}

function livenessFailure(
  status: QdrantLivenessResult["status"],
  latencyMs: number,
  url: string,
  error: string
): QdrantLivenessResult {
  return {
    status,
    latencyMs,
    url,
    dashboardUrl: getQdrantDashboardUrl(),
    collections: {
      post_images: { exists: false, pointsCount: 0 },
      post_faces: { exists: false, pointsCount: 0 },
    },
    error,
  };
}

/** Liveness + readiness probe for the Qdrant service. */
export async function checkQdrantLiveness(profileId?: string): Promise<QdrantLivenessResult> {
  const config = getQdrantConfig();
  if (!isQdrantConfigured(config)) {
    return livenessFailure(
      "disconnected",
      0,
      config.url,
      "QDRANT_URL environment variable is not configured"
    );
  }

  const start = performance.now();
  try {
    const livez = await fetch(`${config.url.replace(/\/$/, "")}/livez`, {
      headers: config.apiKey ? { "api-key": config.apiKey } : undefined,
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Math.round(performance.now() - start);
    if (!livez.ok) {
      return livenessFailure(
        "unhealthy",
        latencyMs,
        config.url,
        `HTTP ${livez.status}: ${livez.statusText}`
      );
    }

    const qdrant = getQdrantClient();
    const [colls, images, faces] = await Promise.all([
      qdrant.getCollections().catch(() => ({ collections: [] })),
      countCollectionPoints(COLLECTIONS.POST_IMAGES, profileId),
      countCollectionPoints(COLLECTIONS.POST_FACES, profileId),
    ]);
    const names = new Set(colls.collections.map((c) => c.name));
    const imagesExist = names.has(COLLECTIONS.POST_IMAGES);
    const facesExist = names.has(COLLECTIONS.POST_FACES);

    return {
      status: imagesExist && facesExist ? "healthy" : "degraded",
      latencyMs,
      url: config.url,
      dashboardUrl: getQdrantDashboardUrl(),
      collections: {
        post_images: { exists: imagesExist, pointsCount: images },
        post_faces: { exists: facesExist, pointsCount: faces },
      },
    };
  } catch (err: unknown) {
    return livenessFailure(
      "disconnected",
      Math.round(performance.now() - start),
      config.url,
      err instanceof Error ? err.message : String(err)
    );
  }
}

function isAlreadyExistsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/already exists/i.test(msg)) return true;
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: number }).status === 409
  );
}

let ensureCollectionsPromise: Promise<void> | null = null;

async function doEnsureCollections(): Promise<void> {
  const qdrant = getQdrantClient();
  const existing = await qdrant.getCollections().catch(() => ({ collections: [] }));
  const existingNames = new Set(existing.collections.map((c) => c.name));

  const specs = [
    { name: COLLECTIONS.POST_IMAGES, size: IMAGE_VECTOR_SIZE, distance: "Cosine" as const },
    { name: COLLECTIONS.POST_FACES, size: FACE_VECTOR_SIZE, distance: "Euclid" as const },
  ];

  for (const spec of specs) {
    if (!existingNames.has(spec.name)) {
      try {
        await qdrant.createCollection(spec.name, {
          vectors: { size: spec.size, distance: spec.distance },
        });
      } catch (err) {
        // A concurrent caller won the race — that's the outcome we wanted anyway.
        if (!isAlreadyExistsError(err)) throw err;
      }
    }
    try {
      await qdrant.createPayloadIndex(spec.name, {
        field_name: "profileId",
        field_schema: "keyword",
      });
    } catch (err) {
      if (!isAlreadyExistsError(err)) throw err;
    }
  }
}

/** Creates the post_images/post_faces collections (+ profileId payload index) if missing. Safe to call repeatedly and concurrently. */
export function ensureCollections(): Promise<void> {
  if (!ensureCollectionsPromise) {
    ensureCollectionsPromise = doEnsureCollections().finally(() => {
      ensureCollectionsPromise = null;
    });
  }
  return ensureCollectionsPromise;
}

/** Media the vector belongs to — a post's own thumbnail or one carousel slide. */
export type VectorSource = "thumbnail" | "carousel";

export interface PostVectorPayload {
  profileId: string;
  postPk: string;
  mediaType: number;
  source: VectorSource;
  carouselPosition?: number;
  imageUrl?: string;
  [key: string]: unknown;
}

const POINT_ID_NAMESPACE = "e3f1a6f4-9b0e-4c2a-8f1a-7c6f2b5a9d3e";

/** Deterministic Qdrant point id (UUIDv5) so re-indexing the same media slot upserts instead of duplicating. */
export function pointId(
  profileId: string,
  postPk: string,
  source: VectorSource,
  position: number,
  faceIndex?: number
): string {
  const name = `${profileId}:${postPk}:${source}:${position}${
    faceIndex !== undefined ? `:face${faceIndex}` : ""
  }`;
  const ns = Buffer.from(POINT_ID_NAMESPACE.replace(/-/g, ""), "hex");
  const b = createHash("sha1")
    .update(Buffer.concat([ns, Buffer.from(name)]))
    .digest()
    .subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function upsertPoints(
  collection: string,
  points: { id: string; vector: number[]; payload: Record<string, unknown> }[]
): Promise<void> {
  if (points.length === 0) return;
  await getQdrantClient().upsert(collection, { wait: true, points });
}

export interface SearchHit {
  score: number;
  payload: Record<string, unknown> | null | undefined;
}

export async function searchByVector(
  collection: string,
  vector: number[],
  profileId: string,
  limit: number
): Promise<SearchHit[]> {
  try {
    const result = await getQdrantClient().query(collection, {
      query: vector,
      filter: { must: [{ key: "profileId", match: { value: profileId } }] },
      limit,
      with_payload: true,
    });
    return result.points.map((p) => ({ score: p.score, payload: p.payload }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/doesn't exist|Not found: Collection|404/.test(message)) {
      throw new VectorIndexNotBuiltError(
        `Collection '${collection}' does not exist in Qdrant. Please run the vector indexer first.`
      );
    }
    throw err;
  }
}
