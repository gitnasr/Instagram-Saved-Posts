/**
 * Docker build-time only: downloads the CLIP model weights into
 * node_modules/@huggingface/transformers/.cache/ so the image ships with
 * them baked in instead of fetching from huggingface.co on first request.
 * Kept dependency-free (no src/ imports) so it can run as its own Docker
 * layer before `COPY . .` — see Dockerfile.
 */
import { pipeline } from "@huggingface/transformers";

async function main() {
  await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32", {
    dtype: "q8",
  });
  console.log("[warm-models] CLIP weights cached.");
}

main().catch((err) => {
  console.error("[warm-models] Failed:", err);
  process.exit(1);
});
