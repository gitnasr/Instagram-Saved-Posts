import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
  type Processor,
} from "@huggingface/transformers";

let processorPromise: Promise<Processor> | null = null;
let visionModelPromise: Promise<CLIPVisionModelWithProjection> | null = null;

function getProcessor(): Promise<Processor> {
  if (!processorPromise) {
    processorPromise = AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch16").catch(
      (err) => {
        processorPromise = null;
        throw err;
      }
    );
  }
  return processorPromise;
}

function getVisionModel(): Promise<CLIPVisionModelWithProjection> {
  if (!visionModelPromise) {
    visionModelPromise = CLIPVisionModelWithProjection.from_pretrained(
      "Xenova/clip-vit-base-patch16",
      { dtype: "fp32" }
    ).catch((err) => {
      visionModelPromise = null;
      throw err;
    });
  }
  return visionModelPromise;
}

async function embed(image: RawImage): Promise<number[]> {
  const [processor, visionModel] = await Promise.all([
    getProcessor(),
    getVisionModel(),
  ]);

  const imageInputs = await processor(image);
  const { image_embeds } = await visionModel(imageInputs);

  const raw = Array.from(image_embeds.data as Float32Array);
  // L2 normalize so cosine distance in Qdrant aligns perfectly with normalized text embeddings
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1;
  return raw.map((v) => v / norm);
}

/** 512-d CLIP embedding for an image at a stable HTTPS URL (Cloudinary or Instagram CDN). */
export async function embedImageFromUrl(url: string): Promise<number[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${url} (${response.status})`);
  }

  const blob = await response.blob();
  const image = await RawImage.fromBlob(blob);
  return embed(image);
}

/** 512-d CLIP embedding for an in-memory image buffer (search-query uploads). */
export async function embedImageFromBuffer(buffer: Buffer): Promise<number[]> {
  const blob = new Blob([new Uint8Array(buffer)]);
  const image = await RawImage.fromBlob(blob);
  return embed(image);
}
