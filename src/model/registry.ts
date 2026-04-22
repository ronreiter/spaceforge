export type PromptFamily = 'gemma' | 'qwen';

export type ModelEntry = {
  id: string;
  label: string;
  sizeGB: number;
  ramGB: number;
  dtype: 'q4f16' | 'fp16' | 'q4';
  family: PromptFamily;
  group: string;
};

// All entries must resolve on https://huggingface.co/<id>.
// Only keep models confirmed to publish ONNX weights with
// WebGPU-compatible quantization.
export const MODELS: ModelEntry[] = [
  // Gemma — instruction-tuned, general-purpose. E* are the newest
  // "effective" (sparse) variants; plain 3/3n are Google's prior tier.
  {
    id: 'onnx-community/gemma-4-E2B-it-ONNX',
    label: 'Gemma 4 E2B (default)',
    sizeGB: 2.0,
    ramGB: 3,
    dtype: 'q4f16',
    family: 'gemma',
    group: 'Gemma',
  },
  {
    id: 'onnx-community/gemma-4-E4B-it-ONNX',
    label: 'Gemma 4 E4B',
    sizeGB: 4.5,
    ramGB: 6,
    dtype: 'q4f16',
    family: 'gemma',
    group: 'Gemma',
  },
  {
    id: 'onnx-community/gemma-3n-E2B-it-ONNX',
    label: 'Gemma 3n E2B',
    sizeGB: 2.0,
    ramGB: 3,
    dtype: 'q4f16',
    family: 'gemma',
    group: 'Gemma',
  },
  {
    id: 'onnx-community/gemma-3-4b-it-ONNX',
    label: 'Gemma 3 4B',
    sizeGB: 2.5,
    ramGB: 4,
    dtype: 'q4f16',
    family: 'gemma',
    group: 'Gemma',
  },
  {
    id: 'onnx-community/gemma-3-1b-it-ONNX',
    label: 'Gemma 3 1B',
    sizeGB: 0.7,
    ramGB: 1.5,
    dtype: 'q4f16',
    family: 'gemma',
    group: 'Gemma',
  },
  {
    id: 'onnx-community/gemma-3-270m-it-ONNX',
    label: 'Gemma 3 270M (tiny)',
    sizeGB: 0.2,
    ramGB: 0.5,
    dtype: 'q4f16',
    family: 'gemma',
    group: 'Gemma',
  },

  // Qwen Coder — the largest Coder variant onnx-community has published
  // with WebGPU-compatible quantization is 3B. 7B/14B/32B ONNX exports
  // exist upstream but are currently CPU-only and far too large for a
  // browser runtime.
  {
    id: 'onnx-community/Qwen2.5-Coder-3B-Instruct',
    label: 'Qwen 2.5 Coder 3B (best coder)',
    sizeGB: 2.3,
    ramGB: 4,
    dtype: 'q4f16',
    family: 'qwen',
    group: 'Qwen Coder',
  },
  {
    id: 'onnx-community/Qwen2.5-Coder-1.5B-Instruct',
    label: 'Qwen 2.5 Coder 1.5B',
    sizeGB: 1.1,
    ramGB: 2,
    dtype: 'q4f16',
    family: 'qwen',
    group: 'Qwen Coder',
  },
  {
    id: 'onnx-community/Qwen2.5-Coder-0.5B-Instruct',
    label: 'Qwen 2.5 Coder 0.5B (tiny)',
    sizeGB: 0.4,
    ramGB: 1,
    dtype: 'q4f16',
    family: 'qwen',
    group: 'Qwen Coder',
  },

  // Qwen 3 — newer general-purpose; good at code in practice.
  {
    id: 'onnx-community/Qwen3-4B-Instruct-2507-ONNX',
    label: 'Qwen 3 4B Instruct (2507)',
    sizeGB: 2.5,
    ramGB: 4,
    dtype: 'q4f16',
    family: 'qwen',
    group: 'Qwen 3',
  },
  {
    id: 'onnx-community/Qwen3-1.7B-ONNX',
    label: 'Qwen 3 1.7B',
    sizeGB: 1.2,
    ramGB: 2,
    dtype: 'q4f16',
    family: 'qwen',
    group: 'Qwen 3',
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;
export const MODEL_STORAGE_KEY = 'spaceforge:model';

export function getModel(id: string): ModelEntry | undefined {
  return MODELS.find((m) => m.id === id);
}

export function fallbackEntry(id: string): ModelEntry {
  return {
    id,
    label: id,
    sizeGB: 0,
    ramGB: 0,
    dtype: 'q4f16',
    family: id.toLowerCase().includes('qwen') ? 'qwen' : 'gemma',
    group: 'Custom',
  };
}
