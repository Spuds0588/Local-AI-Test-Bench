# Third-Party Notices

This project bundles or loads the following third-party software and model
weights. Each is subject to its own license.

## Vendored in this repository

### Needle 2 (Cactus Compute)

- **Files:** `vendor/needle/needle.js`, `vendor/needle/needle.wasm`, `vendor/needle/needle2.cact`
- **Source:** https://huggingface.co/Cactus-Compute/needle2 · https://github.com/cactus-compute/needle
- **License:** Apache License 2.0
- **Full text:** `vendor/needle/LICENSE`
- © Cactus Compute, Inc.

These files are vendored unchanged so the test bench can run Needle 2 entirely
offline. The engine is downloaded once from Hugging Face and cached in the
upstream Python package; here the WebAssembly build and weights are committed so
a static GitHub Pages site can serve them directly.

## Loaded at runtime from a CDN

| Library | Purpose | License |
|---|---|---|
| [diff](https://github.com/kpdecker/jsdiff) | Word-level output diffing | BSD-3-Clause |
| [Transformers.js](https://github.com/huggingface/transformers.js) (`@huggingface/transformers`) | ONNX inference (WASM/WebGPU) | Apache-2.0 |
| [WebLLM](https://github.com/mlc-ai/web-llm) (`@mlc-ai/web-llm`) | MLC WebGPU inference | Apache-2.0 |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) (via Transformers.js) | Inference backend | MIT |

## Model weights (downloaded at runtime from Hugging Face)

| Model | Repository | License |
|---|---|---|
| SmolLM2-135M / 360M / 1.7B-Instruct | `onnx-community/SmolLM2-*-Instruct-ONNX`, `mlc-ai/SmolLM2-*-MLC` | Apache-2.0 |
| LFM2.5-350M | `onnx-community/LFM2.5-350M-ONNX` | Liquid AI LFM license |
| FunctionGemma-270M-it | `onnx-community/functiongemma-270m-it-ONNX` | Gemma terms |
| Qwen3-0.6B / Qwen2.5-0.5B-Instruct | `onnx-community/Qwen*-ONNX`, `mlc-ai/Qwen*-MLC` | Qwen license (Apache-2.0 based) |
| Gemma-3-1B-it / Gemma-2-2B-it | `onnx-community/gemma-3-1b-it-ONNX`, `mlc-ai/gemma-*-MLC` | Gemma terms |

Model weights are not redistributed in this repository. They are fetched from
the Hugging Face Hub at runtime and cached by the browser. Review each model's
license (especially the Gemma terms and Liquid AI LFM license) before
commercial or production use.
