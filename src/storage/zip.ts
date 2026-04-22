import JSZip from 'jszip';
import {
  isTemplate,
  isPageTemplate,
  renderTemplate,
  outputPath,
} from '../runtime/nunjucksRender';
import { isMarkdown, renderMarkdownPage } from '../runtime/markdownRender';
import { injectFrameworkForExport } from '../runtime/iframeRuntime';
import { overlayFiles, CUSTOM_TEMPLATE_ID } from '../templates/registry';

function isPartial(path: string): boolean {
  const base = path.split('/').pop() ?? path;
  return base.startsWith('_');
}

export async function buildZip(
  files: Record<string, string>,
  templateId: string = CUSTOM_TEMPLATE_ID,
): Promise<Blob> {
  const overlay = overlayFiles(files, templateId);
  const zip = new JSZip();

  for (const [path, content] of Object.entries(overlay)) {
    // Markdown pages are rendered through their layout; partials are skipped.
    if (isMarkdown(path)) {
      if (isPartial(path)) continue;
      try {
        const rendered = renderMarkdownPage(path, overlay);
        zip.file(outputPath(path), injectFrameworkForExport(rendered));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        zip.file(outputPath(path), `<!-- markdown render error: ${message} -->`);
      }
      continue;
    }

    // Nunjucks page templates are rendered; partials/layouts are skipped.
    if (isTemplate(path)) {
      if (!isPageTemplate(path)) continue;
      try {
        const rendered = renderTemplate(path, overlay);
        zip.file(outputPath(path), injectFrameworkForExport(rendered));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        zip.file(outputPath(path), `<!-- template error: ${message} -->`);
      }
      continue;
    }

    // Raw .html pages emitted directly by the model also get framework styles
    // so the downloaded archive is self-contained when opened locally.
    if (path.toLowerCase().endsWith('.html')) {
      zip.file(path, injectFrameworkForExport(content));
      continue;
    }

    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'blob' });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
