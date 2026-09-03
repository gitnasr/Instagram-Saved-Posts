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

interface WeightedPrompt {
  prompt: string;
  weight: number;
}

/**
 * Builds an intelligent, multi-aspect prompt ensemble for natural-language search queries.
 *
 * CLIP (Contrastive Language-Image Pretraining) suffers from the "attribute binding"
 * problem: e.g. "woman in yellow pants" has high overlap with any image containing a
 * woman and the color yellow (such as a yellow blouse or yellow dress), because the
 * subject ("woman") and torso dominate visual attention.
 *
 * By deconstructing prepositional queries, isolating the core differentiating garment/object,
 * boosting specific garment tokens, and adding lexical synonyms (pants -> trousers, slacks),
 * we accurately steer the vector embedding toward the user's intended target.
 */
export function buildPromptEnsemble(text: string): WeightedPrompt[] {
  const trimmed = text.trim();
  const prompts: WeightedPrompt[] = [
    { prompt: trimmed, weight: 1.0 },
    { prompt: `a photo of ${trimmed}`, weight: 0.8 },
  ];

  // 1. Person/Subject with garment or attribute:
  // e.g. "woman in yellow pants", "girl wearing red dress", "man in blue suit", "person with sunglasses"
  const personMatch = trimmed.match(
    /^(?:a\s+)?(woman|girl|lady|female|man|guy|boy|male|person|model)\s+(?:in|wearing|with)\s+(.+)$/i
  );
  if (personMatch) {
    const subject = personMatch[1].toLowerCase();
    const attribute = personMatch[2].trim();

    prompts.push({ prompt: attribute, weight: 1.5 });
    prompts.push({ prompt: `wearing ${attribute}`, weight: 1.3 });
    prompts.push({ prompt: `${attribute} outfit`, weight: 1.3 });
    prompts.push({ prompt: `a photo of ${attribute}`, weight: 1.0 });
    prompts.push({ prompt: `${subject} wearing ${attribute}`, weight: 0.7 });

    // Clothing category synonym expansion
    if (/\bpants\b/i.test(attribute)) {
      const trousers = attribute.replace(/\bpants\b/gi, "trousers");
      const slacks = attribute.replace(/\bpants\b/gi, "slacks");
      prompts.push({ prompt: trousers, weight: 1.1 });
      prompts.push({ prompt: slacks, weight: 0.8 });
      prompts.push({ prompt: `${trousers} outfit`, weight: 1.0 });
    } else if (/\btrousers\b/i.test(attribute)) {
      const pants = attribute.replace(/\btrousers\b/gi, "pants");
      prompts.push({ prompt: pants, weight: 1.1 });
      prompts.push({ prompt: `${pants} outfit`, weight: 1.0 });
    } else if (/\bblouse\b/i.test(attribute)) {
      prompts.push({ prompt: attribute.replace(/\bblouse\b/gi, "top"), weight: 0.9 });
    } else if (/\bdress\b/i.test(attribute)) {
      prompts.push({ prompt: attribute.replace(/\bdress\b/gi, "gown"), weight: 0.9 });
    } else if (/\bsweater\b/i.test(attribute)) {
      prompts.push({ prompt: attribute.replace(/\bsweater\b/gi, "knit"), weight: 0.9 });
    }
    return prompts;
  }

  // 2. Direct garment / outfit queries without subject:
  // e.g. "yellow pants", "black leather jacket", "red dress"
  if (
    /\b(pants|trousers|slacks|jeans|shorts|skirt|dress|blouse|shirt|sweater|jacket|coat|hoodie|boots|sneakers)\b/i.test(
      trimmed
    )
  ) {
    prompts.push({ prompt: `${trimmed} outfit`, weight: 1.2 });
    prompts.push({ prompt: `wearing ${trimmed}`, weight: 1.1 });
    prompts.push({ prompt: `a photo of ${trimmed}`, weight: 1.0 });

    if (/\bpants\b/i.test(trimmed)) {
      const trousers = trimmed.replace(/\bpants\b/gi, "trousers");
      prompts.push({ prompt: trousers, weight: 1.0 });
      prompts.push({ prompt: `${trousers} outfit`, weight: 0.9 });
    } else if (/\btrousers\b/i.test(trimmed)) {
      const pants = trimmed.replace(/\btrousers\b/gi, "pants");
      prompts.push({ prompt: pants, weight: 1.0 });
    }
    return prompts;
  }

  // 3. Subject + location/scene preposition:
  // e.g. "cat on the couch", "car on the beach", "dog in the grass"
  const sceneMatch = trimmed.match(
    /^(?:a\s+)?(.+?)\s+(?:on|at|in|near|by)\s+(?:the\s+|a\s+)?(.+)$/i
  );
  if (sceneMatch) {
    const subject = sceneMatch[1].trim();
    const context = sceneMatch[2].trim();
    prompts.push({ prompt: `${subject} and ${context}`, weight: 1.0 });
    prompts.push({ prompt: `photo of ${subject} ${context}`, weight: 0.8 });
    return prompts;
  }

  // 4. Default fallback for general concepts / scenes
  prompts.push({ prompt: `a picture of ${trimmed}`, weight: 0.8 });
  return prompts;
}

/**
 * Generates a 512-dimensional, L2-normalized CLIP text embedding for a natural-language
 * search prompt. Embeds into the exact same vector space as the saved post images.
 * Uses prompt ensembling (averaging variations) to significantly boost retrieval accuracy.
 */
export async function embedText(text: string): Promise<number[]> {
  const [tokenizer, textModel] = await Promise.all([getTokenizer(), getTextModel()]);

  const trimmed = text.trim();
  const promptList = buildPromptEnsemble(trimmed);
  const promptStrings = promptList.map((p) => p.prompt);

  const inputs = tokenizer(promptStrings, { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);

  const dims = 512;
  const data = text_embeds.data as Float32Array;
  const avg = new Float32Array(dims);

  for (let i = 0; i < promptList.length; i++) {
    const offset = i * dims;
    const weight = promptList[i].weight;
    let sumSq = 0;
    for (let d = 0; d < dims; d++) {
      const val = data[offset + d];
      sumSq += val * val;
    }
    const norm = Math.sqrt(sumSq) || 1;
    for (let d = 0; d < dims; d++) {
      avg[d] += (data[offset + d] / norm) * weight;
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
