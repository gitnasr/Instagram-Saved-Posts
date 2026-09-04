import {
  AutoTokenizer,
  CLIPTextModelWithProjection,
  type PreTrainedTokenizer,
} from "@huggingface/transformers";

let tokenizerPromise: Promise<PreTrainedTokenizer> | null = null;
let textModelPromise: Promise<CLIPTextModelWithProjection> | null = null;

function getTokenizer(): Promise<PreTrainedTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch16").catch(
      (err) => {
        tokenizerPromise = null;
        throw err;
      }
    );
  }
  return tokenizerPromise;
}

function getTextModel(): Promise<CLIPTextModelWithProjection> {
  if (!textModelPromise) {
    textModelPromise = CLIPTextModelWithProjection.from_pretrained(
      "Xenova/clip-vit-base-patch16",
      { dtype: "fp32" }
    ).catch((err) => {
      textModelPromise = null;
      throw err;
    });
  }
  return textModelPromise;
}

/**
 * Generates a 512-dimensional, L2-normalized CLIP text embedding for a natural-language
 * search prompt. Embeds into the exact same vector space as the saved post images.
 * Wraps the query in OpenAI's "a photo of {label}" template — the one prompt-engineering
 * trick CLIP's own paper validated across datasets, rather than query-specific heuristics.
 */
export async function embedText(text: string): Promise<number[]> {
  const [tokenizer, textModel] = await Promise.all([getTokenizer(), getTextModel()]);

  const prompt = `a photo of ${text.trim()}`;
  const inputs = tokenizer([prompt], { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);

  const data = text_embeds.data as Float32Array;
  const norm = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0)) || 1;
  return Array.from(data, (v) => v / norm);
}
