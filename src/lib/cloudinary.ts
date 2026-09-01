import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger";
import { prisma } from "./prisma";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryUsageStats {
  plan: string;
  storageUsed: number; // bytes
  storageLimit: number; // bytes
  resources: number; // total image/video count
  bandwidthUsed: number; // bytes
  bandwidthLimit: number; // bytes
  transformations: number;
}

export function isCloudinaryConfigured(config: CloudinaryConfig): boolean {
  return !!(config.cloudName && config.apiKey && config.apiSecret);
}

/** Keys used in the `settings` collection to persist Cloudinary credentials. */
const SETTING_CLOUD_NAME = "cloudinary_cloudName";
const SETTING_API_KEY = "cloudinary_apiKey";
const SETTING_API_SECRET = "cloudinary_apiSecret";

/**
 * Read Cloudinary credentials from the database (settings collection).
 * Falls back to environment variables for backward compatibility with
 * existing deployments that set CLOUDINARY_* env vars.
 */
export async function getCloudinaryConfigFromDB(): Promise<CloudinaryConfig> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [SETTING_CLOUD_NAME, SETTING_API_KEY, SETTING_API_SECRET],
        },
      },
    });

    const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    const cloudName =
      byKey[SETTING_CLOUD_NAME] || process.env.CLOUDINARY_CLOUD_NAME || "";
    const apiKey =
      byKey[SETTING_API_KEY] || process.env.CLOUDINARY_API_KEY || "";
    const apiSecret =
      byKey[SETTING_API_SECRET] || process.env.CLOUDINARY_API_SECRET || "";

    return { cloudName, apiKey, apiSecret };
  } catch {
    // Fallback to env vars if DB is unreachable
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
      apiKey: process.env.CLOUDINARY_API_KEY ?? "",
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
    };
  }
}

/**
 * Persist Cloudinary credentials to the database settings collection.
 */
export async function saveCloudinaryConfigToDB(
  config: CloudinaryConfig
): Promise<void> {
  const now = new Date().toISOString();
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: SETTING_CLOUD_NAME },
      update: { value: config.cloudName, updatedAt: now },
      create: { key: SETTING_CLOUD_NAME, value: config.cloudName, updatedAt: now },
    }),
    prisma.setting.upsert({
      where: { key: SETTING_API_KEY },
      update: { value: config.apiKey, updatedAt: now },
      create: { key: SETTING_API_KEY, value: config.apiKey, updatedAt: now },
    }),
    prisma.setting.upsert({
      where: { key: SETTING_API_SECRET },
      update: { value: config.apiSecret, updatedAt: now },
      create: { key: SETTING_API_SECRET, value: config.apiSecret, updatedAt: now },
    }),
  ]);
}

/**
 * Remove Cloudinary credentials from the database settings collection.
 */
export async function clearCloudinaryConfigFromDB(): Promise<void> {
  await prisma.setting.deleteMany({
    where: {
      key: { in: [SETTING_CLOUD_NAME, SETTING_API_KEY, SETTING_API_SECRET] },
    },
  });
}

/**
 * Synchronous getter for use in sync code paths. Uses env vars only —
 * kept for non-async callers that cannot await the DB lookup.
 * Prefer getCloudinaryConfigFromDB() in async contexts.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  };
}

/**
 * Configure the Cloudinary SDK with the provided credentials.
 */
function applyConfig(config: CloudinaryConfig): void {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  });
}

/**
 * Verify connectivity and return live usage statistics from Cloudinary.
 */
export async function testCloudinaryConnection(
  config: CloudinaryConfig
): Promise<{ success: boolean; stats?: CloudinaryUsageStats; error?: string }> {
  if (!isCloudinaryConfigured(config)) {
    return { success: false, error: "Credentials are incomplete." };
  }

  applyConfig(config);

  try {
    const usage = await cloudinary.api.usage();
    const stats: CloudinaryUsageStats = {
      plan: usage.plan ?? "free",
      storageUsed: usage.storage?.usage ?? 0,
      storageLimit: usage.storage?.limit ?? 0,
      resources: usage.resources ?? 0,
      bandwidthUsed: usage.bandwidth?.usage ?? 0,
      bandwidthLimit: usage.bandwidth?.limit ?? 0,
      transformations: usage.transformations?.usage ?? 0,
    };
    return { success: true, stats };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed";
    logger.warn({ err: error }, "[cloudinary] Connection test failed");
    return { success: false, error: message };
  }
}

export async function uploadToCloudinary(
  imageUrl: string,
  folder: string,
  publicId: string,
  config: CloudinaryConfig
): Promise<string | null> {
  if (!isCloudinaryConfigured(config)) {
    return null;
  }

  applyConfig(config);

  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder,
      public_id: publicId,
      overwrite: true,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error) {
    logger.error(
      { err: error, folder, publicId },
      "Cloudinary upload failed"
    );
    return null;
  }
}
