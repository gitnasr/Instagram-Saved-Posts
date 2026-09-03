import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";

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
 * Returns the public/browser-accessible Qdrant Dashboard URL for user exploration.
 */
export function getQdrantDashboardUrl(): string {
  if (process.env.QDRANT_DASHBOARD_URL) {
    return process.env.QDRANT_DASHBOARD_URL;
  }
  const config = getQdrantConfig();
  if (!config.url) {
    return process.env.NODE_ENV === "production"
      ? ""
      : `http://localhost:${process.env.QDRANT_PORT || 6335}/dashboard`;
  }

  try {
    const parsed = new URL(config.url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const port = parsed.port || process.env.QDRANT_PORT || "6335";
      return `http://localhost:${port}/dashboard`;
    }
    if (parsed.hostname === "qdrant") {
      // In docker network, only default to localhost when not in production
      if (process.env.NODE_ENV === "production") return "";
      const port = process.env.QDRANT_PORT || "6335";
      return `http://localhost:${port}/dashboard`;
    }
    return `${config.url.replace(/\/$/, "")}/dashboard`;
  } catch {
    return "";
  }
}

export const COLLECTIONS = {
  POST_IMAGES: "post_images",
  POST_FACES: "post_faces",
} as const;

export const IMAGE_VECTOR_SIZE = 512; // Xenova/clip-vit-base-patch16
export const FACE_VECTOR_SIZE = 128; // face-api face recognition descriptor

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (client) return client;
  const config = getQdrantConfig();
  if (!isQdrantConfigured(config)) {
    throw new Error(
      "Qdrant is not configured. Set QDRANT_URL (and QDRANT_API_KEY) env vars."
    );
  }
  // js-client-rest defaults to port 6333 even when the URL has no explicit
  // port, so an HTTPS URL behind a reverse proxy (Dokploy domain) silently
  // gets the wrong port unless it's set explicitly here.
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

  const port = url.port
    ? Number(url.port)
    : url.protocol === "https:"
      ? 443
      : 80;
  client = new QdrantClient({
    url: config.url,
    apiKey: config.apiKey,
    port,
    checkCompatibility: false,
  });
  return client;
}

/** Checks whether a specific collection exists in Qdrant. */
export async function checkCollectionExists(name: string): Promise<boolean> {
  try {
    const qdrant = getQdrantClient();
    const existing = await qdrant.getCollections();
    return existing.collections.some((c) => c.name === name);
  } catch {
    return false;
  }
}

/** Counts total points in a collection, optionally filtered by profileId. */
export async function countCollectionPoints(name: string, profileId?: string): Promise<number> {
  try {
    const qdrant = getQdrantClient();
    const filter = profileId
      ? { must: [{ key: "profileId", match: { value: profileId } }] }
      : undefined;
    const res = await qdrant.count(name, { filter, exact: true });
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
  version?: string;
  collections: {
    post_images: { exists: boolean; pointsCount: number };
    post_faces: { exists: boolean; pointsCount: number };
  };
  error?: string;
}

/** Deep liveness and readiness probe for the Qdrant service. */
export async function checkQdrantLiveness(profileId?: string): Promise<QdrantLivenessResult> {
  const config = getQdrantConfig();
  const dashboardUrl = getQdrantDashboardUrl();

  if (!isQdrantConfigured(config)) {
    return {
      status: "disconnected",
      latencyMs: 0,
      url: config.url,
      dashboardUrl,
      collections: {
        post_images: { exists: false, pointsCount: 0 },
        post_faces: { exists: false, pointsCount: 0 },
      },
      error: "QDRANT_URL environment variable is not configured",
    };
  }

  const start = performance.now();
  try {
    // 1. Direct HTTP probe to /livez
    const livezRes = await fetch(`${config.url.replace(/\/$/, "")}/livez`, {
      headers: config.apiKey ? { "api-key": config.apiKey } : undefined,
      signal: AbortSignal.timeout(4000),
    });

    const latencyMs = Math.round(performance.now() - start);

    if (!livezRes.ok) {
      return {
        status: "unhealthy",
        latencyMs,
        url: config.url,
        dashboardUrl,
        collections: {
          post_images: { exists: false, pointsCount: 0 },
          post_faces: { exists: false, pointsCount: 0 },
        },
        error: `HTTP ${livezRes.status}: ${livezRes.statusText}`,
      };
    }

    // 2. Query collections status and point counts
    const qdrant = getQdrantClient();
    const [existingColls, imagesCount, facesCount] = await Promise.all([
      qdrant.getCollections().catch(() => ({ collections: [] })),
      countCollectionPoints(COLLECTIONS.POST_IMAGES, profileId),
      countCollectionPoints(COLLECTIONS.POST_FACES, profileId),
    ]);

    const collNames = new Set(existingColls.collections.map((c) => c.name));
    const imagesExist = collNames.has(COLLECTIONS.POST_IMAGES);
    const facesExist = collNames.has(COLLECTIONS.POST_FACES);

    return {
      status: imagesExist && facesExist ? "healthy" : "degraded",
      latencyMs,
      url: config.url,
      dashboardUrl,
      collections: {
        post_images: { exists: imagesExist, pointsCount: imagesCount },
        post_faces: { exists: facesExist, pointsCount: facesCount },
      },
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      status: "disconnected",
      latencyMs,
      url: config.url,
      dashboardUrl,
      collections: {
        post_images: { exists: false, pointsCount: 0 },
        post_faces: { exists: false, pointsCount: 0 },
      },
      error: errorMsg,
    };
  }
}

function isAlreadyExistsError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  if (/already exists/i.test(msg)) return true;
  if (typeof err === "object" && "status" in err && (err as { status?: number }).status === 409) {
    return true;
  }
  return false;
}

let ensureCollectionsPromise: Promise<void> | null = null;

async function doEnsureCollections(): Promise<void> {
  const qdrant = getQdrantClient();
  const existing = await qdrant.getCollections().catch(() => ({ collections: [] }));
  const existingNames = new Set(existing.collections.map((c) => c.name));

  const specs = [
    {
      name: COLLECTIONS.POST_IMAGES,
      vectors: { size: IMAGE_VECTOR_SIZE, distance: "Cosine" as const },
    },
    {
      name: COLLECTIONS.POST_FACES,
      vectors: { size: FACE_VECTOR_SIZE, distance: "Euclid" as const },
    },
  ];

  for (const spec of specs) {
    if (!existingNames.has(spec.name)) {
      try {
        await qdrant.createCollection(spec.name, {
          vectors: spec.vectors,
        });
      } catch (err: unknown) {
        if (isAlreadyExistsError(err)) {
          // Recheck the collection exists before treating initialization as successful
          const exists = await checkCollectionExists(spec.name);
          if (!exists) {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    // Ensure its profileId payload index exists
    try {
      await qdrant.createPayloadIndex(spec.name, {
        field_name: "profileId",
        field_schema: "keyword",
      });
    } catch (err: unknown) {
      if (!isAlreadyExistsError(err)) {
        throw err;
      }
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

export interface FaceVectorPayload extends PostVectorPayload {
  bbox: { x: number; y: number; width: number; height: number };
}

const POINT_ID_NAMESPACE = "e3f1a6f4-9b0e-4c2a-8f1a-7c6f2b5a9d3e";

/** Deterministic Qdrant point id so re-indexing the same media slot upserts instead of duplicating. */
export function pointId(
  profileId: string,
  postPk: string,
  source: VectorSource,
  position: number,
  faceIndex?: number
): string {
  const key = `${profileId}:${postPk}:${source}:${position}${
    faceIndex !== undefined ? `:face${faceIndex}` : ""
  }`;
  return uuidv5(key, POINT_ID_NAMESPACE);
}

export async function upsertPoints(
  collection: string,
  points: { id: string; vector: number[]; payload: Record<string, unknown> }[]
): Promise<void> {
  if (points.length === 0) return;
  const qdrant = getQdrantClient();
  await qdrant.upsert(collection, { wait: true, points });
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
  const qdrant = getQdrantClient();

  try {
    const result = await qdrant.query(collection, {
      query: vector,
      filter: { must: [{ key: "profileId", match: { value: profileId } }] },
      limit,
      with_payload: true,
    });
    return result.points.map((p) => ({ score: p.score, payload: p.payload }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("doesn't exist") ||
      message.includes("Not found: Collection") ||
      message.includes("404")
    ) {
      throw new VectorIndexNotBuiltError(
        `Collection '${collection}' does not exist in Qdrant. Please run the vector indexer first.`
      );
    }
    throw err;
  }
}
