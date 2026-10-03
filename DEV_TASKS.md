# Dev Task List — Local AI Test Bench

Live at: https://spuds0588.github.io/Local-AI-Test-Bench/

## Completed
- [x] Multi-engine side-by-side bench (Needle 2 WASM, Transformers.js, WebLLM, Chrome Built-in AI) — `index.html`
- [x] Wizard-style 3-step flow with smart model filtering by test mode / engine availability / readiness
- [x] Settings tab: display manager (hide/show models) + pre-download manager with live progress
- [x] Download-readiness persistence hardened against refresh/restart (cache reconciliation + resume affordance)
- [x] README, LICENSE, THIRD_PARTY_NOTICES, GitHub Pages CI workflow, vendored Needle 2 engine
- [x] **Vision capability** — 6 image-understanding models on a `Transformers.js (Vision)` engine (SmolVLM-256M/500M/2B, LFM2.5-VL-450M, Moondream2*, Phi-3.5-vision). The three smallest run on CPU/WASM; verified end-to-end through the real UI. (*Moondream2 is experimental — Transformers.js has no `moondream1` class yet.)
- [x] **Evaluation scoring** — keyword and tool-call grading (`✅ pass / ⚠️ partial / ❌ fail`), aggregate scoreboard, scores in the side-by-side table and CSV export; unit-tested against the shipped functions.
- [x] **Capability-based organisation** — `CAPABILITIES` registry (💬 chat / 🛠️ tool / 👁️ vision) drives a capability picker in step 1; the model picker groups by capability (active one selectable, others collapsed read-only previews with a *Test this instead* switch); Settings groups both lists by primary capability with per-row capability badges. Models outside the active capability can't be selected.

## Backlog (priority order)

### 1. Agentic harness mode (next big feature)
- [ ] Promote "Agentic" to a first-class capability in `CAPABILITIES` (the registry is already built for this — one entry + tags)
- [ ] Single tool schema defined once; mock runtime executes tool calls and feeds results back
- [ ] Multi-turn loop (configurable N steps): model emits tool call → harness executes → result appended → repeat until conclusion or step cap
- [ ] Needle 2 / FunctionGemma use native structured tool calls; chat models parse strict-JSON output
- [ ] Score the *sequence* of calls + final answer against expected traces (more meaningful than single-turn accuracy)
- [ ] Render the step-by-step trace per model in the results card (call → result → next call)

### 2. Expand model coverage
- [ ] Add LFM2.5-230M ONNX (`onnx-community/LFM2.5-230M-ONNX` — verify exists; fallback: 350M only)
- [ ] Add Qwen2.5-1.5B ONNX (currently WebLLM-only) if a working onnx-community repo exists
- [ ] Consider SmolLM2-1.7B ONNX once onnx-community publishes it (currently WebLLM-only)
- [ ] Verify Gemma-2-2B ONNX variant feasibility
- [ ] Find a supported browser VLM > 2B (SmolVLM-Instruct 2B / Phi-3.5-vision) and confirm a WebGPU run end-to-end

### 3. Validate WebGPU path end-to-end
- [ ] Actually run WebLLM models (Qwen3-0.6B, Gemma-3-1B, SmolLM2-1.7B) through the bench
- [ ] Confirm WebGPU device detection chips are accurate and inference produces output
- [ ] Check WebLLM model-library shards reconcile correctly in `reconcileCacheReadiness()`

### 4. CI / tooling cleanup
- [ ] Bump `actions/checkout`, `actions/configure-pages`, `actions/deploy-pages`, `actions/upload-artifact` to Node 24-compatible versions to clear the deprecation warnings

### 5. Bench polish & verification
- [ ] Add cold-run vs warm-run comparison (first load vs cached weights) to the results table
- [ ] Track and display memory footprint (`navigator.deviceMemory`, rough WASM/WebGPU heap)
- [ ] Verify CSV/PDF export correctness with multi-iteration + multi-model batches
- [ ] Test conversational (multi-turn) mode with tool-calling models end-to-end
- [ ] Add a `?cap=vision&models=...` deep-link so hosted runs are shareable
