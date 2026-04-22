import { sanitizePath, isAllowedPath } from './paths';
import { CUSTOM_TEMPLATE_ID } from '../templates/registry';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export type SiteState = {
  files: Record<string, string>;
  chatHistory: ChatMessage[];
  model: string;
  templateId: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = 'spaceforge:site';

export function emptySite(): SiteState {
  const now = Date.now();
  return {
    files: {},
    chatHistory: [],
    model: '',
    templateId: CUSTOM_TEMPLATE_ID,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadSite(): SiteState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptySite();
  try {
    const parsed = JSON.parse(raw) as Partial<SiteState>;
    return { ...emptySite(), ...parsed };
  } catch {
    return emptySite();
  }
}

export function saveSite(state: SiteState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function writeFile(state: SiteState, rawPath: string, contents: string): SiteState {
  const path = sanitizePath(rawPath);
  if (!path) throw new Error(`invalid path: ${rawPath}`);
  if (!isAllowedPath(path)) throw new Error(`extension not allowed: ${path}`);
  return {
    ...state,
    files: { ...state.files, [path]: contents },
    updatedAt: Date.now(),
  };
}

export function deleteFile(state: SiteState, path: string): SiteState {
  if (!(path in state.files)) return state;
  const { [path]: _removed, ...rest } = state.files;
  void _removed;
  return { ...state, files: rest, updatedAt: Date.now() };
}

export function setTemplate(state: SiteState, templateId: string): SiteState {
  if (state.templateId === templateId) return state;
  return { ...state, templateId, updatedAt: Date.now() };
}

export function clearSite(): void {
  localStorage.removeItem(KEY);
}
