import { journalTemplate } from './bundles/journal';
import { gazetteTemplate } from './bundles/gazette';
import { orbitTemplate } from './bundles/orbit';

export type TemplateBundle = {
  id: string;
  name: string;
  description: string;
  // Files owned by the template (e.g. _layout.njk, _header.njk, _footer.njk,
  // styles.css, optionally scripts.js). When this template is selected these
  // files SHADOW any generated files of the same path at render time — the
  // generated files themselves stay in localStorage untouched.
  files: Record<string, string>;
};

export const CUSTOM_TEMPLATE_ID = 'custom';

export const TEMPLATES: TemplateBundle[] = [
  {
    id: CUSTOM_TEMPLATE_ID,
    name: 'Custom (AI-generated)',
    description:
      'The model writes its own _layout.njk, _header.njk, _footer.njk, and styles.css.',
    files: {},
  },
  journalTemplate,
  gazetteTemplate,
  orbitTemplate,
];

export function getTemplate(id: string): TemplateBundle | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function overlayFiles(
  siteFiles: Record<string, string>,
  templateId: string,
): Record<string, string> {
  if (templateId === CUSTOM_TEMPLATE_ID) return siteFiles;
  const tpl = getTemplate(templateId);
  if (!tpl) return siteFiles;
  return { ...siteFiles, ...tpl.files };
}

export function isTemplateOwnedPath(templateId: string, path: string): boolean {
  if (templateId === CUSTOM_TEMPLATE_ID) return false;
  const tpl = getTemplate(templateId);
  return !!tpl && path in tpl.files;
}
