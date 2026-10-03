/**
 * Vision smoke test.
 *
 * Downloads the smallest vision models through Transformers.js and runs them on
 * a generated fixture image (a red square + green triangle + blue square). It
 * asserts the model actually *sees* the image — that is the thing a static
 * check cannot prove.
 *
 * This is heavy (hundreds of MB per model, CPU inference) and is therefore not
 * part of `npm test`. Run it explicitly:
 *
 *   npm run test:vision                 # default: the two smallest models
 *   npm run test:vision -- --all        # every vision model in the registry
 *   npm run test:vision -- --repo <hf-repo> --dtype q4
 *   npm run test:vision -- --offline    # skip download-requiring tests
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { buildVisionPrompt, preprocessImage, generateFromInputs, visionTaskPrompt } from './lib/vision-request.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const opt = name => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const offline = flag('--offline');

// ---- fixture image -----------------------------------------------------------
// A 320x240 PNG drawn by hand so the test has no binary fixture to check in and
// no dependency on an image library. Contents: light-grey background, a large
// red rectangle, a green triangle, and a blue square.
function makeFixturePng() {
  const W = 320, H = 240;
  const raw = Buffer.alloc(H * (1 + W * 3));
  let o = 0;
  for (let y = 0; y < H; y++) {
    raw[o++] = 0; // filter byte
    for (let x = 0; x < W; x++) {
      let r = 235, g = 235, b = 235;
      if (40 <= x && x < 200 && 40 <= y && y < 140) { r = 220; g = 30; b = 30; }      // red rectangle
      else if (240 <= x && x < 300 && 170 <= y && y < 230) { r = 30; g = 60; b = 220; } // blue square
      else if (20 <= x && x < 120 && 170 <= y && y < 230 && (x - 20) < (y - 170) * 1.2) { r = 30; g = 180; b = 70; } // green triangle
      raw[o++] = r; raw[o++] = g; raw[o++] = b;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- registry (read the real one out of index.html) --------------------------
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const modStart = html.indexOf('const MODELS = [');
const modEnd = html.indexOf('\n    ];', modStart);
const modelsSrc = html.slice(modStart + 'const MODELS = '.length, modEnd + '\n    ]'.length);
const MODELS = new Function(`const MODELS = ${modelsSrc};\nreturn MODELS;`)();

let passed = 0, failed = 0, skipped = 0;
const check = (label, cond, extra = '') => {
  if (cond) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${extra ? ' — ' + extra : ''}`); }
};

// ---- fixture sanity (no model needed) ---------------------------------------
console.log('\nfixture image');
const png = makeFixturePng();
check('fixture PNG generated', png.length > 100, `${png.length} bytes`);
const outDir = path.join(root, 'tools', 'out');
fs.mkdirSync(outDir, { recursive: true });
const fixturePath = path.join(outDir, 'vision-fixture.png');
fs.writeFileSync(fixturePath, png);
check('fixture written to tools/out/', fs.existsSync(fixturePath));

// ---- prompt construction (no model needed) ----------------------------------
console.log('\nprompt construction');
const fakeWithTemplate = { apply_chat_template: (m) => JSON.stringify(m) };
const p1 = buildVisionPrompt(fakeWithTemplate, 'Describe this image.');
check('uses the chat template when available', typeof p1 === 'string' && p1.includes('Describe this image.'));
const fakeNoTemplate = {
  tokenizer: { bos_token: '<|startoftext|>' },
  apply_chat_template: () => { throw new Error('Unable to apply chat template without a tokenizer.'); },
};
const p2 = buildVisionPrompt(fakeNoTemplate, 'Describe this image.');
check('falls back to a hand-built prompt without a template',
  p2.startsWith('<|startoftext|>user\n<image>') && p2.endsWith('assistant\n'), JSON.stringify(p2));
check('system prompt is included in the fallback', buildVisionPrompt(fakeNoTemplate, 'x', 'Be terse.').includes('system\nBe terse.'));
check('task prompts resolve', visionTaskPrompt('ocr').startsWith('Read and transcribe'));
check('custom prompt overrides the task', visionTaskPrompt('describe', 'Count the shapes.') === 'Count the shapes.');

// ---- real models -------------------------------------------------------------
if (offline) {
  console.log('\nmodel inference\n  skip (--offline)');
} else {
  let tf;
  try {
    tf = await import('@huggingface/transformers');
  } catch (e) {
    console.log('\nmodel inference');
    console.log('  skip — @huggingface/transformers is not installed. Run: npm install');
    skipped++;
    tf = null;
  }

  if (tf) {
    const requestedRepo = opt('--repo');
    const toRun = requestedRepo
      ? [{ repo: requestedRepo, dtype: opt('--dtype') || 'q4', order: opt('--order') || 'text-image', label: requestedRepo }]
      : flag('--all')
        ? MODELS.filter(m => m.engine === 'vision')
        : MODELS.filter(m => ['vl-smolvlm-256m', 'vl-lfm25-450m'].includes(m.id));

    console.log('\nmodel inference');
    for (const m of toRun) {
      const label = m.label || m.repo;
      console.log(`\n  --- ${label} (${m.repo}, ${m.dtype}) ---`);
      try {
        const processor = await tf.AutoProcessor.from_pretrained(m.repo);
        const model = await tf.AutoModelForImageTextToText.from_pretrained(m.repo, { dtype: m.dtype, device: 'cpu' });
        const image = await tf.RawImage.fromBlob(new Blob([png], { type: 'image/png' }));
        check(`${label}: image decodes to 320x240`, image.width === 320 && image.height === 240, `${image.width}x${image.height}`);

        const prompt = buildVisionPrompt(processor, visionTaskPrompt('describe'));
        const { inputs, order } = await preprocessImage(processor, image, prompt, m.order);
        check(`${label}: processor produced input_ids + pixel_values`, !!inputs.input_ids && !!inputs.pixel_values, Object.keys(inputs).join(','));
        console.log(`         processor argument order used: ${order}`);

        const t0 = Date.now();
        const text = await generateFromInputs(model, processor, inputs, 48);
        const secs = (Date.now() - t0) / 1000;
        console.log(`         ${secs.toFixed(1)}s · "${text.slice(0, 160)}"`);

        check(`${label}: produced non-empty output`, text.length > 0);
        const hay = text.toLowerCase();
        const colors = ['red', 'green', 'blue'].filter(c => hay.includes(c));
        check(`${label}: output names at least one fixture colour`, colors.length >= 1, `named: ${colors.join(', ') || 'none'}`);

        try { model.dispose && model.dispose(); } catch (e) {}
        try { processor.dispose && processor.dispose(); } catch (e) {}
      } catch (e) {
        check(`${label}: load + inference`, false, (e.message || String(e)).slice(0, 220));
      }
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}\n`);
process.exit(failed ? 1 : 0);
