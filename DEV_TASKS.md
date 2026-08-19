# Dev Task List — Local AI Test Bench

Live at: https://spuds0588.github.io/Local-AI-Test-Bench/

## Completed
- [x] Multi-engine side-by-side bench (Needle 2 WASM, Transformers.js, WebLLM, Chrome Built-in AI) — `index.html`
- [x] Wizard-style 3-step flow with smart model filtering by test mode / engine availability / readiness
- [x] Settings tab: display manager (hide/show models) + pre-download manager with live progress
- [x] Download-readiness persistence hardened against refresh/restart (cache reconciliation + resume affordance)
- [x] README, LICENSE, THIRD_PARTY_NOTICES, GitHub Pages CI workflow, vendored Needle 2 engine

## Backlog (priority order)

### 1. Agentic harness mode (requested — next big feature)
- [ ] Add "Agentic" as a fourth test type in Step 1
- [ ] Single tool schema defined once; mock runtime executes tool calls and feeds results back
- [ ] Multi-turn loop (configurable N steps): model emits tool call → harness executes → result appended → repeat until conclusion or step cap
- [ ] Needle 2 / FunctionGemma use native structured tool calls; chat models parse strict-JSON output
- [ ] Score the *sequence* of calls + final answer against expected traces (more meaningful than single-turn accuracy)
- [ ] Render the step-by-step trace per model in the results card (call → result → next call)

### 2. Evaluation scoring ("Evaluate" mode)
- [ ] Pass/fail scoring of tool-call accuracy against expected outputs
- [ ] Normalize/parse tool-call JSON; exact-match + partial-match (argument-level) scoring
- [ ] Aggregate scoreboard across models with per-test breakdown, exportable with existing CSV/PDF

### 3. Expand model coverage
- [ ] Add LFM2.5-230M ONNX (`onnx-community/LFM2.5-230M-ONNX` — verify exists; fallback: 350M only)
- [ ] Add Qwen2.5-1.5B ONNX (currently WebLLM-only) if a working onnx-community repo exists
- [ ] Consider SmolLM2-1.7B ONNX once onnx-community publishes it (currently WebLLM-only)
- [ ] Verify Gemma-2-2B ONNX variant feasibility

### 4. Validate WebGPU path end-to-end
- [ ] Actually run WebLLM models (Qwen3-0.6B, Gemma-3-1B, SmolLM2-1.7B) through the bench
- [ ] Confirm WebGPU device detection chips are accurate and inference produces output
- [ ] Check WebLLM model-library shards reconcile correctly in `reconcileCacheReadiness()`

### 5. CI / tooling cleanup
- [ ] Bump `actions/checkout`, `actions/configure-pages`, `actions/deploy-pages`, `actions/upload-artifact` to Node 24-compatible versions to clear the deprecation warnings
- [ ] Add a lightweight `npm run check`-style local validation (HTML lint / JS syntax) to the workflow

### 6. Bench polish & verification
- [ ] Add cold-run vs warm-run comparison (first load vs cached weights) to the results table
- [ ] Track and display memory footprint (`navigator.deviceMemory`, rough WASM/WebGPU heap)
- [ ] Verify CSV/PDF export correctness with multi-iteration + multi-model batches
- [ ] Test conversational (multi-turn) mode with tool-calling models end-to-end
- [ ] Add a `?mode=agentic&models=...` deep-link so hosted runs are shareable
