import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";

export interface QdrantConfig {
  url: string;
  apiKey?: string;
}

/**
 * Qdrant credentials are injected as production env vars (Dokploy),
 * never stored in or edited through app settings — same convention as
 * Cloudinary in src/lib/cloudinary.ts.
 */
export function getQdrantConfig(): QdrantConfig {
  return {
    url: process.env.QDRANT_URL ?? "",
    apiKey: process.env.QDRANT_API_KEY,
  };
}

export function isQdrantConfigured(config: QdrantConfig): boolean {
  return !!config.url;
}

export const COLLECTIONS = {
  POST_IMAGES: "post_images",
  POST_FACES: "post_faces",
} as const;

export const IMAGE_VECTOR_SIZE = 512; // Xenova/clip-vit-base-patch32
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
  const port = url.port
    ? Number(url.port)
    : url.protocol === "https:"
      ? 443
      : 80;
  client = new QdrantClient({ url: config.url, apiKey: config.apiKey, port });
  return client;
}

/** Creates the post_images/post_faces collections (+ profileId payload index) if missing. Safe to call repeatedly. */
export async function ensureCollections(): Promise<void> {
  const qdrant = getQdrantClient();
  const existing = await qdrant.getCollections();
  const existingNames = new Set(existing.collections.map((c) => c.name));

  if (!existingNames.has(COLLECTIONS.POST_IMAGES)) {
    await qdrant.createCollection(COLLECTIONS.POST_IMAGES, {
      vectors: { size: IMAGE_VECTOR_SIZE, distance: "Cosine" },
    });
  }
  if (!existingNames.has(COLLECTIONS.POST_FACES)) {
    await qdrant.createCollection(COLLECTIONS.POST_FACES, {
      vectors: { size: FACE_VECTOR_SIZE, distance: "Euclid" },
    });
  }

  for (const name of [COLLECTIONS.POST_IMAGES, COLLECTIONS.POST_FACES]) {
    await qdrant.createPayloadIndex(name, {
      field_name: "profileId",
      field_schema: "keyword",
    });
  }
}

/** Media the vector belongs to — a post's own thumbnail or one carousel slide. */
export type VectorSource = "thumbnail" | "carousel";

export interface PostVectorPayload {
  profileId: string;
  postPk: string;
  mediaType: number;
  source: VectorSource;
  carouselPosition?: number;
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
  const result = await qdrant.query(collection, {
    query: vector,
    filter: { must: [{ key: "profileId", match: { value: profileId } }] },
    limit,
    with_payload: true,
  });
  return result.points.map((p) => ({ score: p.score, payload: p.payload }));
}
