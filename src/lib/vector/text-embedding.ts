import {
  AutoTokenizer,
  CLIPTextModelWithProjection,
  type PreTrainedTokenizer,
} from "@huggingface/transformers";

let tokenizerPromise: Promise<PreTrainedTokenizer> | null = null;
let textModelPromise: Promise<CLIPTextModelWithProjection> | null = null;

function getTokenizer(): Promise<PreTrainedTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch32");
  }
  return tokenizerPromise;
}

function getTextModel(): Promise<CLIPTextModelWithProjection> {
  if (!textModelPromise) {
    textModelPromise = CLIPTextModelWithProjection.from_pretrained(
      "Xenova/clip-vit-base-patch32",
      { dtype: "q8" }
    );
  }
  return textModelPromise;
}

/**
 * Generates a 512-dimensional, L2-normalized CLIP text embedding for a natural-language
 * search prompt. Embeds into the exact same vector space as the saved post images.
 */
export async function embedText(text: string): Promise<number[]> {
  const [tokenizer, textModel] = await Promise.all([getTokenizer(), getTextModel()]);

  const inputs = tokenizer([text], { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);

  const raw = Array.from(text_embeds.data as Float32Array);
  // L2 normalize so cosine distance in Qdrant aligns perfectly with normalized image embeddings
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1;
  return raw.map((v) => v / norm);
}
