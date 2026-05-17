import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function isCloudinaryConfigured(config: CloudinaryConfig): boolean {
  return !!(config.cloudName && config.apiKey && config.apiSecret);
}

/**
 * Cloudinary credentials are injected as production env vars (Dokploy),
 * never stored in or edited through app settings.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  };
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

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  });

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
