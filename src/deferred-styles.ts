// No diferir icons.css: íconos deben renderizar siempre (menú y acciones).
const DEFERRED_STYLES = ['bootstrap.css'] as const;

export function loadDeferredStyles(): void {
  for (const href of DEFERRED_STYLES) {
    if (document.querySelector(`link[data-deferred-style="${href}"]`)) {
      continue;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.setAttribute('data-deferred-style', href);
    link.onload = () => {
      link.media = 'all';
    };
    document.head.appendChild(link);
  }
}
