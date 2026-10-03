# Local SLM Test Bench

A single-page, fully **client-side** test bench for running small language models (SLMs) — and small **vision-language models (VLMs)** — side-by-side in the browser. No server, no API keys, no cloud inference. Originally built to exercise Chrome's built-in Gemini Nano, it now also drives **Needle 2**, **SmolLM2**, **Liquid LFM2.5**, **FunctionGemma**, **Qwen 2.5 / Qwen3**, and **Gemma 2 / 3** through three browser inference runtimes, plus a fourth **Vision** runtime for image understanding.

Everything runs locally: model weights download once from Hugging Face (or are vendored into this repo in Needle 2's case) and are cached by your browser.

> ▶️ **Try it now:** the bench is hosted on GitHub Pages at
> **[https://spuds0588.github.io/Local-AI-Test-Bench/](https://spuds0588.github.io/Local-AI-Test-Bench/)**
> (models download on first use — see [Browser requirements](#browser-requirements)).

## Features

- **Side-by-side comparison** — select any number of models and run the same prompt across all of them in parallel; each model gets its own streaming card.
- **Multiple runtimes**
  - **Chrome Built-in AI** — Gemini Nano via the `LanguageModel` / `ai.languageModel` API.
  - **Needle 2 (Cactus Compute)** — the official 45M engine running in WebAssembly, vendored in this repo (14 MB, zero network after load).
  - **Transformers.js (ONNX)** — SmolLM2, LFM2.5, FunctionGemma, Qwen, Gemma 3 via WASM (CPU) or WebGPU.
  - **WebLLM (MLC · WebGPU)** — quantized Qwen, Gemma, and SmolLM2 for fast GPU-accelerated inference.
- **Capability-first flow** — step 1 asks *what kind of test* you're running; that choice drives the whole run. Models are organised by **capability** (💬 Chat, 🛠️ Tool Calling, 👁️ Vision) in both the model picker and Settings, and each capability brings its own controls, validation and scoring.
  - **💬 Chat / Instruction Following** — plain prompt → text output.
  - **🛠️ Tool Calling & Structured Output** — declare a JSON function schema and watch each model map a request to a structured call. Needle 2 and FunctionGemma use their native tool formats; the other models receive the schemas in the system prompt and are asked for strict JSON.
  - **👁️ Vision / Image Understanding** — drop in an image (or click to browse) and pick a task (describe, detailed, objects & colors, OCR, or a custom prompt). Each vision model streams its own description. Images are processed entirely on-device.
- **Evaluation scoring** — paste expected keywords (comma/newline separated) or an expected tool-call JSON object and every run is graded **✅ pass / ⚠️ partial / ❌ fail**, per iteration and aggregated into a leaderboard. Scores are included in the CSV export.
- **Quantitative comparison table** — wall-clock time, output length, estimated tokens, tokens/sec, score, and diff% vs. the previous run per model.
- **Conversational vs. stateless** — toggle per-session context retention.
- **Iterations, file context injection** (drag-and-drop or click-to-browse), **run history** (localStorage), CSV export, and print-to-PDF.

## Model matrix

| Model | Params | Engine in this bench | Strength |
|---|---|---|---|
| **Needle 2** (Cactus Compute) | 45M (CQ2-bit) | Vendored WASM engine | Ultra-low-footprint agentic tool calling |
| **SmolLM2-Instruct** (Hugging Face) | 135M · 360M · 1.7B | Transformers.js + WebLLM (1.7B/360M) | Ultra-low-memory chat, sentence completion |
| **LFM2.5** (Liquid AI) | 350M | Transformers.js (ONNX) | Hybrid architecture, math/logic, fast edge inference |
| **FunctionGemma** (Google) | 270M | Transformers.js (ONNX) | Native structured tool calling / argument extraction |
| **Qwen 2.5 / Qwen3** (Alibaba) | 0.5B · 0.6B | Transformers.js + WebLLM | Multilingual, coding, strict JSON |
| **Gemma 2 / 3** (Google) | 1B · 2B | Transformers.js + WebLLM | Instruction following & reasoning |

### Capabilities & how models are organised

A model declares the capabilities it supports in its `modes` array (`['chat']`, `['tool']`,
`['chat','tool']`, `['vision']`, …). The `CAPABILITIES` registry turns those keys into the test
categories the bench offers:

| Capability | What it tests | Extra controls |
|---|---|---|
| 💬 `chat` | Free-form instruction following | — |
| 🛠️ `tool` | Tool calling / structured JSON (incl. Needle 2 & FunctionGemma native formats) | Tools JSON schema |
| 👁️ `vision` | Image understanding | Image upload + vision task |

How the capability shapes the UI:

- **Step 1** renders the capabilities as cards — pick the one under test.
- **Step 2** groups models **by capability** (the one under test first and selectable; the others
  are collapsed, read-only previews with a one-click *Test this instead* switch). Within a
  capability models are still sub-grouped by engine for the colour coding. Checkboxes for models
  outside the active capability are disabled, so a mismatched model can never be run.
- **Settings → Displayed Models / Downloads** group the same way, filed under each model's
  *primary* capability (its first declared mode). Badges on each row show **every** capability a
  model supports, so a `chat`+`tool` model is listed once but marked as both.
- **Run validation and scoring** follow the capability: vision requires an uploaded image, tool
  calling validates the tools JSON and grades the emitted call, chat grades keywords.

Adding a new capability (for example a dedicated agentic/Needle test type) means adding one entry
to `CAPABILITIES` / `CAPABILITY_ORDER` and tagging models with the new key — no picker changes.
`npm run check` verifies every mode maps to a capability and every capability is used.

### Vision models (image understanding)

These are the vision-language entries on the **Transformers.js (Vision)** runtime, which uses
`AutoProcessor` + `AutoModelForImageTextToText`. Sizes are the actual bytes of the quantised ONNX
files that get downloaded, measured against the Hub.

| Model | Params | Quant | Download | Backend | Verified |
|---|---|---|---|---|---|
| **SmolVLM-256M-Instruct** | 256M | q4 | ~265MB | WASM or WebGPU | ✅ runs on CPU |
| **LFM2.5-VL-450M** (Liquid AI) | 450M | q4f16 | ~385MB | WASM or WebGPU | ✅ runs on CPU |
| **SmolVLM-500M-Instruct** | 500M | q4 | ~485MB | WASM or WebGPU | ✅ runs on CPU |
| **SmolVLM-Instruct** | 2B | q4f16 | ~1.4GB | WebGPU | ⬜ not downloaded here |
| **Moondream2** | 1.8B | q4 | ~1.5GB | WebGPU | ❌ unsupported (see below) |
| **Phi-3.5-vision-instruct** (Microsoft) | 4.2B | q4f16 | ~2.5GB | WebGPU | ⬜ not downloaded here |

### Vision runtime notes

- **Repository names.** The vision entries point at the ONNX weights that actually resolve on the
  Hub: SmolVLM comes from the `HuggingFaceTB` repos (which publish ONNX weights directly), and the
  Phi-3.5 entry uses `onnx-community/Phi-3.5-vision-instruct`. Note that
  `Xenova/Phi-3.5-vision-instruct` does not exist on the Hub, so the `onnx-community` repo is used.
  The two SmolVLM *tiny* variants (256M/500M) are included because they are the only vision models
  here that run on CPU.
- **Moondream2 is unsupported by Transformers.js.** Its config declares `model_type: moondream1`, and
  Transformers.js has no matching model class (it ships `Phi3VForCausalLM`,
  `Idefics3ForConditionalGeneration` and `Lfm2VlForConditionalGeneration`, but no `Moondream`). The
  entry is kept, marked *experimental* in the picker, and expected to fail at load. A working browser
  Moondream would need a community ONNX repo with a supported architecture.
- **WebGPU-only models** (2B and above) are hidden from the picker when WebGPU is unavailable, because
  their weights exceed what the WASM heap can hold. The three smallest run on CPU/WASM.

> The "230M" LFM2.5 and "1.5B" Qwen variants are not wired in yet — the 350M LFM2.5 and 0.5B/0.6B Qwen variants cover the same tiers. Adding more entries is a one-line change in the `MODELS` registry inside `index.html`.

## Running locally

The page uses ES-module `import()` and fetches model weights, so it must be served over HTTP(S) — opening `index.html` with `file://` won't work.

```bash
# any static server works
python3 -m http.server 8000
# then open http://127.0.0.1:8000/
```

## Hosting on GitHub Pages

A deploy workflow is included at `.github/workflows/pages.yml`.

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab).

The site is published at `https://<user>.github.io/<repo>/` — for this repo:
**https://spuds0588.github.io/Local-AI-Test-Bench/**.
`index.html` sits at the repo root, so it becomes the landing page.

### Important GitHub Pages note

Model weights are loaded **at runtime from Hugging Face's CDN**, not from this repo (the exception is Needle 2, whose 14 MB engine + weights are vendored under `vendor/needle/`). First load of each Transformers.js / WebLLM model downloads anywhere from ~100 MB to ~1.4 GB and is then cached by the browser's Cache API. Hugging Face serves these files with permissive CORS headers, so cross-origin loading from GitHub Pages works.

## Browser requirements

- **Chrome / Edge** — everything, including Built-in Gemini Nano.
  - *Built-in AI* is behind a flag on some versions: enable `chrome://flags/#prompt-api-for-gemini-nano` (and `#optimization-guide-on-device-model` on older builds) and restart.
- **WebGPU** — needed for WebLLM and for fast Transformers.js inference; falls back to WASM (CPU) automatically where WebGPU is absent.
- **Safari / Firefox** — Transformers.js (WASM) and Needle 2 work; Built-in AI and WebLLM do not. The two smallest vision models (SmolVLM-256M, LFM2.5-VL-450M) also run on WASM, so they work in Firefox/Safari; the larger vision models need WebGPU.

## How the tool-calling mode works

Tool Calling mode presents a JSON array of function schemas (a smart-home set is pre-loaded). The protocol differs by model, by design:

- **Needle 2** — receives the raw schema array through its native grammar-constrained API and returns a calibrated call envelope (`type`, `function_calls`, `reasoning`, `confidence`, `prefill_tps`, `decode_tps`). Unsupported requests are refused with an empty call rather than hallucinated.
- **FunctionGemma** — uses its native `<start_function_call>call:…<end_function_call>` format via the tokenizer's chat template with `tools`.
- **All other models** — receive the schemas in the system prompt plus an instruction to emit a single JSON object `{"function": "...", "arguments": {...}}` (or `{"function": null}` when nothing fits).

This is an honest comparison of each model's *native* strength (Needle and FunctionGemma are function-calling specialists) rather than forcing one protocol on everything. The mode note under the tools editor explains this.

## How the vision mode works

Vision mode takes an image from a drag-and-drop / click-to-browse zone, decodes it to a `RawImage` in the browser, and sends it through each
selected vision model with `AutoProcessor` + `AutoModelForImageTextToText`. Two repo differences are
handled automatically:

- **Prompt format** — models with a chat template get `apply_chat_template`; repos without one
  (moondream2) fall back to a hand-built `role\n<image>text\n` prompt.
- **Processor argument order** — the registry records whether the repo takes `(text, image)` or
  `(image, text)`; the adapter tries the declared order first and the other as a fallback.

The task picker (describe / detailed / objects & colors / OCR) supplies the prompt; choosing
*Use the user prompt below* sends your own text instead. For an OCR fixture with no text in it, the
model is asked to reply exactly `no text` so the scorer has a deterministic target.

## Evaluation scoring

The expected-output box on step 1 turns grading on. Its shape selects the grader:

- **Keywords** — comma/newline-separated terms matched case-insensitively against the output. All
  present → pass, some → partial, none → fail.
- **Tool call** — a leading `{` is parsed as an expected call and scored function-first, then
  argument-by-argument. Right function and all arguments → pass; right function, some arguments →
  partial; wrong function → fail. Output JSON is extracted even when wrapped in prose or markdown fences.

Scores appear per-iteration on each model card, per-run in the summary table, and aggregated into the
**Evaluation Scoreboard** (runs, pass/partial/fail counts, mean score) under the results. The CSV
export gains `Score` and `Score Detail` columns.

## Metrics & fairness caveats

- **Time** is wall-clock end-to-end per iteration, including model load for the first iteration.
- **~Tokens** and **~tok/s** are estimates (character count / 4) except where the engine reports real counts; Needle 2 shows its engine-reported prefill/decode rates.
- WASM/CPU and WebGPU numbers are not directly comparable across devices — that's the point of running them side-by-side on *your* hardware.
- Small models vary run-to-run; use Iterations > 1 and Retain History to probe consistency, and the Δ% column to measure output drift between runs.

## Privacy

All inference happens on-device. Prompts and outputs never leave your browser except for the one-time model download from Hugging Face. Run history is stored in `localStorage` on your machine only.

## Project structure

```
index.html                The entire bench (UI + engine adapters)
tools/check-static.mjs    Static validation of index.html (syntax, DOM, registry, Hub repos)
tools/test-scoring.mjs    Unit tests for the evaluation scoring functions
tools/test-vision.mjs     Smoke test: downloads + runs real VLMs on a fixture image
tools/lib/vision-request.mjs  Shared vision prompt/processor logic (mirrors adapterVision)
vendor/needle/            Needle 2 engine (needle.js/needle.wasm) + weights (needle2.cact)
                          Vendored so the bench works without hitting HF for Needle 2.
                          Apache-2.0 © Cactus Compute — see vendor/needle/LICENSE
.github/workflows/pages.yml   GitHub Pages deployment
.github/workflows/checks.yml  CI: static check + scoring tests
LICENSE                   MIT (this project)
THIRD_PARTY_NOTICES.md    Bundled dependency & model license notes
```

## Adding a model

Add one entry to the `MODELS` array in `index.html`:

```js
{ id: 'tf-my-model', engine: 'transformers', repo: 'onnx-community/My-Model-ONNX',
  label: 'My Model', params: '0.5B', size: '~400MB', note: 'Vendor' },
// or for WebLLM:
{ id: 'wl-my-model', engine: 'webllm', wlId: 'My-Model-q4f16_1-MLC', ... },
// or for a vision model:
{ id: 'vl-my-model', engine: 'vision', modes: ['vision'], repo: 'org/My-VLM-ONNX',
  label: 'My VLM', params: '0.5B', size: '~500MB', dtype: 'q4', order: 'text-image' },
```

`modes` is the model's **capability** tag and must be one of the keys in the `CAPABILITIES`
registry (`chat`, `tool`, `vision`); it decides which capability sections the model appears in and
whether it can be selected for the test you picked. `npm run check` enforces this.

The adapter handles download, caching, streaming, and metrics automatically.

Vision entries need two extra fields, both dictated by the repo:

- **`dtype`** — the ONNX quantisation to fetch (`q4`, `q4f16`, `quantized`, …). Use the smallest one
  that is present in the repo's `onnx/` directory.
- **`order`** — some processors are called `(text, image)` (`text-image`), others `(image, text)`
  (`image-text`). The adapter tries the declared order and falls back to the other, so a wrong guess
  degrades to a warning rather than a failure. Add `needsWebGPU: true` for checkpoints too large for
  the WASM heap.

`npm run check` verifies that a new repo resolves on the Hub and that the registry stays consistent.

## Testing & tooling

The bench itself is a static page, so the tooling targets the parts that can be checked without a
browser or a GPU:

```bash
npm install

npm run check        # static validation (fast, no downloads)
npm test             # scoring unit tests (fast, no downloads)
npm run test:vision  # download + run real VLMs on a generated fixture image
```

- **`npm run check`** ([tools/check-static.mjs](tools/check-static.mjs)) — parses the inline app
  script, checks HTML tag balance, verifies every `$('#id')` reference exists in the markup, validates
  the `MODELS` registry (unique ids, known engines, required per-engine fields), and confirms every
  model repo resolves on the Hugging Face Hub. `--offline` skips the network check.
- **`npm test`** ([tools/test-scoring.mjs](tools/test-scoring.mjs)) — extracts the real scoring
  functions out of `index.html` and asserts on them, so the tests exercise the shipped code rather
  than a copy. Covers keyword and tool-call grading, JSON extraction from prose/markdown, and the
  pass/partial/fail boundaries.
- **`npm run test:vision`** ([tools/test-vision.mjs](tools/test-vision.mjs)) — generates a fixture
  image (red rectangle, green triangle, blue square) with no binary checked in, then downloads real
  vision models through the shared request builder in [tools/lib/vision-request.mjs](tools/lib/vision-request.mjs)
  and asserts they produce non-empty output naming a fixture colour. Options: `--all` (every vision
  model), `--repo <hf-repo> --dtype q4`, `--offline` (skip downloads).

The shared library exists so the prompt-building and processor-calling conventions the browser uses
can be tested in Node; keep it in sync with `adapterVision` in `index.html`.

## License

MIT — see [LICENSE](LICENSE). Bundled and CDN-loaded dependencies are covered separately in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Individual model weights carry their own licenses (notably Gemma's terms and Liquid AI's LFM license); review them before commercial use.
