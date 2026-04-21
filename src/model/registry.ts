export type PromptFamily = 'gemma' | 'qwen';

export type ModelEntry = {
  id: string;
  label: string;
  sizeGB: number;
  ramGB: number;
  dtype: 'q4f16' | 'fp16' | 'q4';
  family: PromptFamily;
};

export const MODELS: ModelEntry[] = [
  {
    id: 'onnx-community/gemma-4-E2B-it-ONNX',
    label: 'Gemma 4 E2B (default)',
    sizeGB: 2.0,
    ramGB: 3,
    dtype: 'q4f16',
    family: 'gemma',
  },
  {
    id: 'onnx-community/gemma-4-E4B-it-ONNX',
    label: 'Gemma 4 E4B',
    sizeGB: 4.5,
    ramGB: 6,
    dtype: 'q4f16',
    family: 'gemma',
  },
  {
    id: 'onnx-community/Qwen2.5-Coder-3B-Instruct-ONNX',
    label: 'Qwen 2.5 Coder 3B',
    sizeGB: 2.3,
    ramGB: 4,
    dtype: 'q4f16',
    family: 'qwen',
  },
  {
    id: 'onnx-community/Qwen2.5-Coder-7B-Instruct-ONNX',
    label: 'Qwen 2.5 Coder 7B',
    sizeGB: 5.5,
    ramGB: 9,
    dtype: 'q4f16',
    family: 'qwen',
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
  };
}
