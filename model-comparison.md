# Model comparison: Gemma 4 E4B vs Qwen 2.5 Coder vs Qwen 3 4B Instruct

_Status: in progress — see [Execution log](#execution-log)._

## What we're comparing

| Model | Id | Params | Size | Family | Notes |
|---|---|---|---|---|---|
| **Gemma 4 E4B** | `onnx-community/gemma-4-E4B-it-ONNX` | 4B (effective, MoE-lite) | ~4.5 GB | Gemma | Google's MoE-lite 4B; balanced coder + generalist. |
| **Qwen 2.5 Coder 1.5B** | `onnx-community/Qwen2.5-Coder-1.5B-Instruct` | 1.5B | ~1.1 GB | Qwen | Coder-specialized; should follow the `===FILE:===` protocol religiously. |
| **Qwen 3 4B Instruct** | `onnx-community/Qwen3-4B-Instruct-2507-ONNX` | 4B | ~2.5 GB | Qwen | Latest Qwen generalist; bigger but newer post-training recipe. |

Qwen 2.5 Coder 0.5B is deliberately excluded — it's the "tiny" fallback and well below E4B / Qwen3 4B in every dimension; not a fair comparison.

## Rubric (how we grade each output)

For each prompt × model we score:

1. **Protocol compliance** — Did the model emit `===FILE: path===` / `===END===` blocks at all? (binary; no file = prose-only failure)
2. **Required file set** — Did it emit the mandatory files? For Custom template the spec requires `index.md`, `_layout.njk`, `_header.njk`, `_footer.njk`, `styles.css`.
3. **File count** — Total files emitted (including bonus pages).
4. **Rendering validity** — Do the files render through Spaceforge's pipeline without template errors? (Nunjucks syntax? Markdown parseable? CSS valid?)
5. **Dangling links** — Does `_header.njk` link to pages that aren't emitted? (the "Ana Photography but no about.md" bug we hit earlier)
6. **Content quality** — Subjective: does the copy match the prompt, is it coherent?
7. **Time to first file** (TTFF) — How long before the first `===FILE:===` starts.
8. **Total tokens** / **Total wall-clock time**.

Per-model summary:

- **Durability** = how often protocol compliance + required file set are both ✅ across prompts.
- **Best overall** = weighted: durability (40%) + rendering validity (30%) + content quality (20%) + speed (10%).

## Test prompts

Fixed across models. Kept short enough to stay within the model's effective context.

| # | Prompt | Signals |
|---|---|---|
| P1 | "A one-page portfolio for a landscape photographer named Ana, with an About page." | Multi-page with nav, layout with include, no dangling links. |
| P2 | "A three-page site for a local bakery — home, menu, contact." | 3 pages, consistent branding, cross-links in header. |
| P3 | "A product landing page for a smart plant pot called Sprout." | Single page, marketing copy, CTA. |

## Execution constraints

- Playwright MCP's headless chromium-headless-shell has **no WebGPU**; transformers.js falls back to **WASM** inference on CPU. A 4B model through WASM is on the order of 0.2–1 tokens/sec — a full site generation (2–7K tokens) would take **hours per prompt**.
- Real-browser WebGPU inference (the user's Chrome) runs 3–30 tokens/sec for these models.
- Models not already cached need to download (0.3–4.5 GB each) before the first run.

### Strategy

1. **Do one smoke run** per model through the Spaceforge UI via Playwright MCP using the SMALLEST reasonable prompt (P3). Record numbers and output.
2. For any model where step 1 doesn't complete in a bounded window (say, 5 min), fall back to **qualitative analysis** based on:
   - Observed behavior from prior sessions (we've used Gemma 4 E4B and Qwen variants before).
   - Known architectural differences.
   - Per-model system prompts in `src/model/systemPrompt.gemma.ts` / `systemPrompt.qwen.ts` — the prompts are tuned per family.
3. Summarize in the per-model scorecard below.

## Per-model scorecards

_(filled in during execution)_

### Gemma 4 E4B

| Prompt | Protocol | Files | Render | Links | Content | TTFF | Total |
|---|---|---|---|---|---|---|---|
| P1 |  |  |  |  |  |  |  |
| P2 |  |  |  |  |  |  |  |
| P3 |  |  |  |  |  |  |  |

### Qwen 2.5 Coder 1.5B

| Prompt | Protocol | Files | Render | Links | Content | TTFF | Total |
|---|---|---|---|---|---|---|---|
| P1 |  |  |  |  |  |  |  |
| P2 |  |  |  |  |  |  |  |
| P3 |  |  |  |  |  |  |  |

### Qwen 3 4B Instruct

| Prompt | Protocol | Files | Render | Links | Content | TTFF | Total |
|---|---|---|---|---|---|---|---|
| P1 |  |  |  |  |  |  |  |
| P2 |  |  |  |  |  |  |  |
| P3 |  |  |  |  |  |  |  |

## Execution log

_(appended during runs)_

## Verdict

_(populated once runs complete)_
