/**
 * Shared vision request builder.
 *
 * This mirrors the logic in `index.html`'s `adapterVision` / `visionPrompt` so
 * the exact prompt and processor calling convention the browser bench uses can
 * be exercised in Node without a browser. Keep the two in sync when either
 * changes — the smoke test (`tools/test-vision.mjs`) is what catches drift.
 */

export const VISION_TASKS = {
  describe: 'Describe this image concisely.',
  detailed: 'Describe this image in detail, including objects, their positions, colors and any text.',
  objects: 'List the main objects in this image and their colors, as a short comma-separated list.',
  ocr: 'Read and transcribe all visible text in this image. If there is no text, reply exactly: no text.',
};

/** The task text for a given vision task id (mirrors `visionPrompt`). */
export function visionTaskPrompt(task, customPrompt = '') {
  if (task === 'custom') return customPrompt.trim();
  return customPrompt.trim() || VISION_TASKS[task] || VISION_TASKS.describe;
}

/**
 * Build the prompt string for a vision model.
 *
 * Uses the tokenizer's chat template when present, and falls back to the
 * hand-rolled `role\n<image>text\n` form for repos like moondream2 that ship
 * without one.
 */
export function buildVisionPrompt(processor, userPrompt, sysPrompt = '') {
  const messages = [];
  if (sysPrompt) messages.push({ role: 'system', content: sysPrompt });
  messages.push({ role: 'user', content: [{ type: 'image' }, { type: 'text', text: userPrompt }] });
  try {
    return processor.apply_chat_template(messages, { add_generation_prompt: true });
  } catch (e) {
    const bos = (processor.tokenizer && processor.tokenizer.bos_token) || '<|startoftext|>';
    return `${bos}${sysPrompt ? 'system\n' + sysPrompt + '\n' : ''}user\n<image>${userPrompt}\nassistant\n`;
  }
}

/**
 * Run the processor with the model's declared argument order, falling back to
 * the opposite order. Returns `{ inputs, order }` where `order` is whichever
 * convention actually worked, so a test can report it.
 */
export async function preprocessImage(processor, image, prompt, order = 'text-image') {
  const opts = { add_special_tokens: false };
  const first = order === 'image-text' ? [image, prompt] : [prompt, image];
  try {
    return { inputs: await processor(...first, opts), order };
  } catch (e) {
    const other = order === 'image-text' ? 'text-image' : 'image-text';
    const second = other === 'image-text' ? [image, prompt] : [prompt, image];
    try {
      return { inputs: await processor(...second, opts), order: other };
    } catch (e2) {
      throw new Error(`Processor rejected both argument orders (${order}, ${other}): ${e2.message}`);
    }
  }
}

/** Generate text from preprocessed inputs, mirroring the adapter's fallbacks. */
export async function generateFromInputs(model, processor, inputs, maxNewTokens = 48) {
  let out;
  try {
    out = await model.generate({ ...inputs, max_new_tokens: maxNewTokens, do_sample: false });
  } catch (e) {
    out = await model.generate({ ...inputs, max_new_tokens: maxNewTokens, do_sample: false });
  }
  let text = '';
  try { text = processor.batch_decode(out, { skip_special_tokens: true })[0] || ''; } catch (e) {}
  return text.replace(/\s+/g, ' ').trim();
}
