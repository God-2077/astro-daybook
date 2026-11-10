import type { MermaidConfig } from 'mermaid';

type Mermaid = typeof import('mermaid').default;

let mermaidPromise: Promise<Mermaid> | null = null;
let initializedTheme: string | null = null;
let listenerBound = false;
let renderChain: Promise<void> = Promise.resolve();
let renderSequence = 0;

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import('mermaid').then((module) => module.default);
  return mermaidPromise;
}

function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? 'hsl(' + value + ')' : fallback;
}

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** 把站点的 HSL 令牌映射成 Mermaid 主题变量，保证图表和纸页同一套颜色。 */
function buildConfig(theme: 'light' | 'dark'): MermaidConfig {
  const root = getComputedStyle(document.documentElement);
  const font = root.getPropertyValue('--font-sans').trim() || 'sans-serif';

  return {
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: 'base',
    darkMode: theme === 'dark',
    themeVariables: {
      background: cssColor('--background', '#ffffff'),
      mainBkg: cssColor('--card', '#ffffff'),
      primaryColor: cssColor('--accent', '#f5f0f2'),
      primaryTextColor: cssColor('--foreground', '#333333'),
      primaryBorderColor: cssColor('--border', '#e5dde0'),
      lineColor: cssColor('--muted-foreground', '#666666'),
      secondaryColor: cssColor('--muted', '#f3edef'),
      tertiaryColor: cssColor('--background', '#ffffff'),
      textColor: cssColor('--foreground', '#333333'),
      nodeBorder: cssColor('--border', '#e5dde0'),
      clusterBkg: cssColor('--muted', '#f3edef'),
      clusterBorder: cssColor('--border', '#e5dde0'),
      titleColor: cssColor('--card-foreground', '#333333'),
      edgeLabelBackground: cssColor('--background', '#ffffff'),
      actorBkg: cssColor('--accent', '#f5f0f2'),
      actorBorder: cssColor('--border', '#e5dde0'),
      actorTextColor: cssColor('--foreground', '#333333'),
      actorLineColor: cssColor('--muted-foreground', '#666666'),
      signalColor: cssColor('--muted-foreground', '#666666'),
      signalTextColor: cssColor('--foreground', '#333333'),
      labelBoxBkgColor: cssColor('--muted', '#f3edef'),
      labelBoxBorderColor: cssColor('--border', '#e5dde0'),
      labelTextColor: cssColor('--foreground', '#333333'),
      loopTextColor: cssColor('--foreground', '#333333'),
      noteBkgColor: cssColor('--accent', '#f5f0f2'),
      noteBorderColor: cssColor('--border', '#e5dde0'),
      noteTextColor: cssColor('--foreground', '#333333'),
      activationBkgColor: cssColor('--accent', '#f5f0f2'),
      activationBorderColor: cssColor('--border', '#e5dde0'),
      sequenceNumberColor: cssColor('--background', '#ffffff'),
      fontFamily: font,
      fontSize: '14px',
    },
  };
}

async function ensureMermaid(): Promise<Mermaid> {
  const mermaid = await loadMermaid();
  const theme = currentTheme();
  if (initializedTheme !== theme) {
    mermaid.initialize(buildConfig(theme));
    initializedTheme = theme;
  }
  return mermaid;
}

async function renderFigure(figure: HTMLElement, force: boolean): Promise<void> {
  if (!force && figure.dataset.mermaidState === 'done') return;

  const source = figure.querySelector<HTMLElement>('.a-mermaid-source');
  const canvas = figure.querySelector<HTMLElement>('.a-mermaid-canvas');
  const error = figure.querySelector<HTMLElement>('.a-mermaid-error');
  if (!source || !canvas || !error) return;

  const code = source.textContent ?? '';
  if (!code.trim()) return;

  figure.dataset.mermaidState = 'rendering';
  error.hidden = true;
  canvas.replaceChildren();

  const id = 'mermaid-' + Date.now().toString(36) + '-' + (++renderSequence).toString(36);
  try {
    const mermaid = await ensureMermaid();
    const { svg } = await mermaid.render(id, code);
    if (!svg) throw new Error('empty mermaid output');
    canvas.innerHTML = svg;
    figure.dataset.mermaidState = 'done';
    error.hidden = true;
  } catch {
    figure.dataset.mermaidState = 'error';
    error.hidden = false;
    canvas.replaceChildren();
  } finally {
    for (const temporary of [document.getElementById(id), document.getElementById('d' + id)]) {
      if (temporary && !canvas.contains(temporary)) temporary.remove();
    }
  }
}

async function renderAll(force: boolean): Promise<void> {
  const figures = Array.from(document.querySelectorAll<HTMLElement>('[data-mermaid]'));
  for (const figure of figures) {
    await renderFigure(figure, force);
  }
}

function enqueue(task: () => Promise<void>): void {
  renderChain = renderChain.then(task, task);
}

let debounceTimer = 0;

/** 页面加载与 ClientRouter 换页后都会调用；只渲染还没完成的图表。 */
export function initMermaid(): void {
  if (!listenerBound) {
    listenerBound = true;
    document.addEventListener('daybook:theme-change', () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        enqueue(() => renderAll(true));
      }, 60);
    });
  }
  enqueue(() => renderAll(false));
}
