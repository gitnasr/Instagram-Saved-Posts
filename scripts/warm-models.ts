/**
 * Docker build-time only: downloads the CLIP model weights (vision & text) into
 * the Transformers.js cache so the image ships with them baked in instead
 * of fetching from huggingface.co on first request.
 */
import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  AutoTokenizer,
  CLIPTextModelWithProjection,
} from "@huggingface/transformers";

async function main() {
  console.log("[warm-models] Warming CLIP vision processor & projection model...");
  await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch16");
  await CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch16", {
    dtype: "fp32",
  });

  console.log("[warm-models] Warming CLIP text tokenizer & projection model...");
  await AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch16");
  await CLIPTextModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch16", {
    dtype: "fp32",
  });

  console.log("[warm-models] All CLIP weights cached successfully.");
}

main().catch((err) => {
  console.error("[warm-models] Failed:", err);
  process.exit(1);
});
