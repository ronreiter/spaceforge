export const NAV_RUNTIME_MARKER = '/*spaceforge:nav-runtime*/';

const NAV_RUNTIME_SCRIPT = `
<script>${NAV_RUNTIME_MARKER}
(function(){
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href) return;
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return;
    e.preventDefault();
    try { parent.postMessage({ type: 'spaceforge:nav', href: href }, '*'); } catch(_){}
  }, true);
})();
</script>
`.trim();

function normalizeLocalRef(ref: string): string {
  return ref.replace(/^\.?\/+/, '');
}

function isLocalRef(href: string): boolean {
  if (!href) return false;
  return !/^(https?:|data:|blob:|mailto:|tel:|\/\/)/i.test(href);
}

export function renderPage(html: string, files: Record<string, string>): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('link[rel="stylesheet"][href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!isLocalRef(href)) return;
    const key = normalizeLocalRef(href);
    const content = files[key];
    if (content === undefined) return;
    const style = doc.createElement('style');
    style.setAttribute('data-spaceforge-inlined', href);
    style.textContent = content;
    link.replaceWith(style);
  });

  doc.querySelectorAll('script[src]').forEach((script) => {
    const src = script.getAttribute('src') || '';
    if (!isLocalRef(src)) return;
    const key = normalizeLocalRef(src);
    const content = files[key];
    if (content === undefined) return;
    const s = doc.createElement('script');
    s.setAttribute('data-spaceforge-inlined', src);
    const type = script.getAttribute('type');
    if (type) s.setAttribute('type', type);
    s.textContent = content;
    script.replaceWith(s);
  });

  const head = doc.head ?? doc.documentElement;
  const runtimeFragment = new DOMParser().parseFromString(NAV_RUNTIME_SCRIPT, 'text/html');
  const runtimeScript = runtimeFragment.querySelector('script');
  if (runtimeScript) {
    const imported = doc.importNode(runtimeScript, true);
    head.insertBefore(imported, head.firstChild);
  }

  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
