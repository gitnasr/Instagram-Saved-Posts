import {
  AutoTokenizer,
  CLIPTextModelWithProjection,
  type PreTrainedTokenizer,
} from "@huggingface/transformers";

let tokenizerPromise: Promise<PreTrainedTokenizer> | null = null;
let textModelPromise: Promise<CLIPTextModelWithProjection> | null = null;

function getTokenizer(): Promise<PreTrainedTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch32").catch(
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
      "Xenova/clip-vit-base-patch32",
      { dtype: "q8" }
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
 * Uses prompt ensembling (averaging variations) to significantly boost retrieval accuracy.
 */
export async function embedText(text: string): Promise<number[]> {
  const [tokenizer, textModel] = await Promise.all([getTokenizer(), getTextModel()]);

  const trimmed = text.trim();
  // Prompt ensembling: query + descriptive templates stabilize linguistic variance
  const prompts = [
    trimmed,
    `a photo of ${trimmed}`,
    `a picture of ${trimmed}`,
  ];

  const inputs = tokenizer(prompts, { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);

  const dims = 512;
  const data = text_embeds.data as Float32Array;
  const avg = new Float32Array(dims);

  for (let i = 0; i < prompts.length; i++) {
    const offset = i * dims;
    let sumSq = 0;
    for (let d = 0; d < dims; d++) {
      const val = data[offset + d];
      sumSq += val * val;
    }
    const norm = Math.sqrt(sumSq) || 1;
    for (let d = 0; d < dims; d++) {
      avg[d] += data[offset + d] / norm;
    }
  }

  // Final L2 normalization of ensembled vector
  let totalSumSq = 0;
  for (let d = 0; d < dims; d++) totalSumSq += avg[d] * avg[d];
  const finalNorm = Math.sqrt(totalSumSq) || 1;

  const result: number[] = new Array(dims);
  for (let d = 0; d < dims; d++) {
    result[d] = avg[d] / finalNorm;
  }
  return result;
}
