import { v2 as cloudinary } from "cloudinary";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function isCloudinaryConfigured(config: CloudinaryConfig): boolean {
  return !!(config.cloudName && config.apiKey && config.apiSecret);
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const getVal = (key: string) =>
    db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .get()?.value;

  return {
    cloudName: getVal("cloudinary_cloud_name") ?? "",
    apiKey: getVal("cloudinary_api_key") ?? "",
    apiSecret: getVal("cloudinary_api_secret") ?? "",
  };
}

export async function uploadToCloudinary(
  imageUrl: string,
  folder: string,
  publicId: string,
  config: CloudinaryConfig
): Promise<string | null> {
  if (
    !isCloudinaryConfigured(config)
  ) {
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
    console.error("Cloudinary upload failed:", error);
    return null;
  }
}
