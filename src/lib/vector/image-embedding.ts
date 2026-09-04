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

/** 512-d L2-normalized CLIP embedding for an in-memory image buffer. */
export async function embedImageFromBuffer(buffer: Buffer): Promise<number[]> {
  const [processor, visionModel] = await Promise.all([getProcessor(), getVisionModel()]);

  const image = await RawImage.fromBlob(new Blob([new Uint8Array(buffer)]));
  const { image_embeds } = await visionModel(await processor(image));

  // L2 normalize so cosine distance in Qdrant aligns with the normalized text embeddings
  const raw = Array.from(image_embeds.data as Float32Array);
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1;
  return raw.map((v) => v / norm);
}
