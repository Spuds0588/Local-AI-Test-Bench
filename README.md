# Local SLM Test Bench

A single-page, fully **client-side** test bench for running small language models (SLMs) side-by-side in the browser — no server, no API keys, no cloud inference. Originally built to exercise Chrome's built-in Gemini Nano, it now also drives **Needle 2**, **SmolLM2**, **Liquid LFM2.5**, **FunctionGemma**, **Qwen 2.5 / Qwen3**, and **Gemma 2 / 3** through three browser inference runtimes.

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
- **Two test modes**
  - **Chat / Instruction Following** — plain prompt → text output.
  - **Tool Calling & Structured Output** — declare a JSON function schema and watch each model map a request to a structured call. Needle 2 and FunctionGemma use their native tool formats; the other models receive the schemas in the system prompt and are asked for strict JSON.
- **Quantitative comparison table** — wall-clock time, output length, estimated tokens, tokens/sec, and diff% vs. the previous run per model.
- **Conversational vs. stateless** — toggle per-session context retention.
- **Iterations, file context injection, run history** (localStorage), CSV export, and print-to-PDF.

## Model matrix

| Model | Params | Engine in this bench | Strength |
|---|---|---|---|
| **Needle 2** (Cactus Compute) | 45M (CQ2-bit) | Vendored WASM engine | Ultra-low-footprint agentic tool calling |
| **SmolLM2-Instruct** (Hugging Face) | 135M · 360M · 1.7B | Transformers.js + WebLLM (1.7B/360M) | Ultra-low-memory chat, sentence completion |
| **LFM2.5** (Liquid AI) | 350M | Transformers.js (ONNX) | Hybrid architecture, math/logic, fast edge inference |
| **FunctionGemma** (Google) | 270M | Transformers.js (ONNX) | Native structured tool calling / argument extraction |
| **Qwen 2.5 / Qwen3** (Alibaba) | 0.5B · 0.6B | Transformers.js + WebLLM | Multilingual, coding, strict JSON |
| **Gemma 2 / 3** (Google) | 1B · 2B | Transformers.js + WebLLM | Instruction following & reasoning |

> The "230M" LFM2.5 and "1.5B" Qwen variants from the original landscape write-up are not wired in yet — the 350M LFM2.5 and 0.5B/0.6B Qwen variants cover the same tiers. Adding more entries is a one-line change in the `MODELS` registry inside `index.html`.

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
- **Safari / Firefox** — Transformers.js (WASM) and Needle 2 work; Built-in AI and WebLLM do not.

## How the tool-calling mode works

Tool Calling mode presents a JSON array of function schemas (a smart-home set is pre-loaded). The protocol differs by model, by design:

- **Needle 2** — receives the raw schema array through its native grammar-constrained API and returns a calibrated call envelope (`type`, `function_calls`, `reasoning`, `confidence`, `prefill_tps`, `decode_tps`). Unsupported requests are refused with an empty call rather than hallucinated.
- **FunctionGemma** — uses its native `<start_function_call>call:…<end_function_call>` format via the tokenizer's chat template with `tools`.
- **All other models** — receive the schemas in the system prompt plus an instruction to emit a single JSON object `{"function": "...", "arguments": {...}}` (or `{"function": null}` when nothing fits).

This is an honest comparison of each model's *native* strength (Needle and FunctionGemma are function-calling specialists) rather than forcing one protocol on everything. The mode note under the tools editor explains this.

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
vendor/needle/            Needle 2 engine (needle.js/needle.wasm) + weights (needle2.cact)
                          Vendored so the bench works without hitting HF for Needle 2.
                          Apache-2.0 © Cactus Compute — see vendor/needle/LICENSE
.github/workflows/pages.yml   GitHub Pages deployment
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
```

The adapter handles download, caching, streaming, and metrics automatically.

## License

MIT — see [LICENSE](LICENSE). Bundled and CDN-loaded dependencies are covered separately in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Individual model weights carry their own licenses (notably Gemma's terms and Liquid AI's LFM license); review them before commercial use.
