import { pipeline, RawImage, type ImageFeatureExtractionPipeline } from "@huggingface/transformers";

let extractorPromise: Promise<ImageFeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<ImageFeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32", {
      dtype: "q8",
    });
  }
  return extractorPromise;
}

async function embed(image: RawImage): Promise<number[]> {
  const extractor = await getExtractor();
  // clip-vit-base-patch32's ONNX export has no pooler layer, so `{ pool: true }`
  // (the only option the .d.ts documents) throws. `pooling`/`normalize` are the
  // actual runtime-supported options for this pipeline; types just lag the lib.
  const output = await extractor(image, { pooling: "mean", normalize: true } as never);
  return Array.from(output.data as Float32Array);
}

/** 512-d CLIP embedding for an image at a stable HTTPS URL (Cloudinary). */
export async function embedImageFromUrl(url: string): Promise<number[]> {
  const image = await RawImage.fromURL(url);
  return embed(image);
}

/** 512-d CLIP embedding for an in-memory image buffer (search-query uploads). */
export async function embedImageFromBuffer(buffer: Buffer): Promise<number[]> {
  const blob = new Blob([new Uint8Array(buffer)]);
  const image = await RawImage.fromBlob(blob);
  return embed(image);
}
