import type { MermaidConfig } from 'mermaid';

type Mermaid = typeof import('mermaid').default;
type Point = { x: number; y: number };
type View = { scale: number; x: number; y: number };

type Gesture = {
  pointers: Map<number, Point>;
  startView: View;
  startPoint: Point;
  startMid: Point;
  startDistance: number;
  dragging: boolean;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.2;

let mermaidPromise: Promise<Mermaid> | null = null;
let initializedTheme: string | null = null;
let listenerBound = false;
let controlsBound = false;
let resizeBound = false;
let renderChain: Promise<void> = Promise.resolve();
let renderSequence = 0;
let resizeFrame = 0;

const viewportBound = new WeakSet<HTMLElement>();

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import('mermaid').then((module) => module.default);
  return mermaidPromise;
}

function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
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

function viewportOf(figure: HTMLElement): HTMLElement | null {
  return figure.querySelector<HTMLElement>('[data-mermaid-viewport]');
}

function canvasOf(figure: HTMLElement): HTMLElement | null {
  return figure.querySelector<HTMLElement>('.a-mermaid-canvas');
}

function toolsOf(figure: HTMLElement): HTMLElement | null {
  return figure.querySelector<HTMLElement>('[data-mermaid-tools]');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readView(figure: HTMLElement): View {
  return {
    scale: clamp(finite(figure.dataset.mermaidZoom, 1), MIN_SCALE, MAX_SCALE),
    x: finite(figure.dataset.mermaidPanX, 0),
    y: finite(figure.dataset.mermaidPanY, 0),
  };
}

/**
 * 统一应用平移与缩放。
 *
 * transform-origin 在 canvas 中心；translate 是屏幕像素，scale 围绕中心。
 * 平移量按图表实际溢出量夹紧，避免把图拖出视野后找不回来。
 */
function setView(figure: HTMLElement, next: View): void {
  const canvas = canvasOf(figure);
  const viewport = viewportOf(figure);
  if (!canvas || !viewport) return;

  const scale = Math.round(clamp(next.scale, MIN_SCALE, MAX_SCALE) * 1000) / 1000;
  const contentWidth = canvas.offsetWidth;
  const contentHeight = canvas.offsetHeight;
  const maxX = Math.max(0, (contentWidth * scale - viewport.clientWidth) / 2);
  const maxY = Math.max(0, (contentHeight * scale - viewport.clientHeight) / 2);
  const x = clamp(next.x, -maxX, maxX);
  const y = clamp(next.y, -maxY, maxY);

  figure.dataset.mermaidZoom = String(scale);
  figure.dataset.mermaidPanX = String(Math.round(x * 100) / 100);
  figure.dataset.mermaidPanY = String(Math.round(y * 100) / 100);
  canvas.style.transform = `translate3d(${Math.round(x * 100) / 100}px, ${Math.round(y * 100) / 100}px, 0) scale(${scale})`;
  syncZoomButtons(figure);
}

function resetView(figure: HTMLElement): void {
  const canvas = canvasOf(figure);
  if (canvas) canvas.style.removeProperty('transform');
  figure.dataset.mermaidZoom = '1';
  figure.dataset.mermaidPanX = '0';
  figure.dataset.mermaidPanY = '0';
  syncZoomButtons(figure);
}

function syncZoomButtons(figure: HTMLElement): void {
  const scale = readView(figure).scale;
  const zoomIn = figure.querySelector<HTMLButtonElement>('[data-mermaid-action="zoom-in"]');
  const zoomOut = figure.querySelector<HTMLButtonElement>('[data-mermaid-action="zoom-out"]');
  if (zoomIn) zoomIn.disabled = scale >= MAX_SCALE - 0.001;
  if (zoomOut) zoomOut.disabled = scale <= MIN_SCALE + 0.001;
}

function zoomAround(figure: HTMLElement, targetScale: number, anchor: Point = { x: 0, y: 0 }): void {
  const current = readView(figure);
  const scale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
  if (Math.abs(scale - current.scale) < 0.0001) return;
  const ratio = scale / current.scale;
  setView(figure, {
    scale,
    x: anchor.x * (1 - ratio) + current.x * ratio,
    y: anchor.y * (1 - ratio) + current.y * ratio,
  });
}

function zoomBy(figure: HTMLElement, delta: number): void {
  const current = readView(figure);
  zoomAround(figure, Math.round((current.scale + delta) * 100) / 100);
}

function refreshView(figure: HTMLElement): void {
  window.requestAnimationFrame(() => {
    if (figure.isConnected) setView(figure, readView(figure));
  });
}

function isFullscreen(figure: HTMLElement): boolean {
  return document.fullscreenElement === figure || figure.classList.contains('is-expanded');
}

function syncFullscreenButton(figure: HTMLElement): void {
  const button = figure.querySelector<HTMLButtonElement>('[data-mermaid-action="fullscreen"]');
  if (!button) return;
  const active = isFullscreen(figure);
  const label = active ? (button.dataset.labelClose ?? '') : (button.dataset.labelFullscreen ?? '');
  button.setAttribute('aria-label', label);
  button.title = label;
  button.querySelector('use')?.setAttribute('href', active ? '#i-x' : '#i-expand');
}

function syncAllFullscreen(): void {
  for (const figure of document.querySelectorAll<HTMLElement>('[data-mermaid]')) {
    syncFullscreenButton(figure);
    refreshView(figure);
  }
}

function unlockFallback(figure: HTMLElement): void {
  figure.classList.remove('is-expanded');
  if (!document.querySelector('.a-mermaid.is-expanded')) {
    document.documentElement.classList.remove('is-mermaid-locked');
  }
  syncFullscreenButton(figure);
}

async function toggleFullscreen(figure: HTMLElement): Promise<void> {
  if (document.fullscreenElement === figure) {
    await document.exitFullscreen();
    return;
  }
  if (figure.classList.contains('is-expanded')) {
    unlockFallback(figure);
    refreshView(figure);
    return;
  }

  try {
    await figure.requestFullscreen();
  } catch {
    // 浏览器拒绝 Fullscreen API（例如权限策略）时退化为固定的阅读层。
    figure.classList.add('is-expanded');
    document.documentElement.classList.add('is-mermaid-locked');
    syncFullscreenButton(figure);
  }
  refreshView(figure);
}

function applyAction(figure: HTMLElement, action: string): void {
  if (action === 'zoom-in') zoomBy(figure, SCALE_STEP);
  else if (action === 'zoom-out') zoomBy(figure, -SCALE_STEP);
  else if (action === 'reset') resetView(figure);
  else if (action === 'fullscreen') void toggleFullscreen(figure);
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>('[data-mermaid-action]');
  if (!button) return;
  const figure = button.closest<HTMLElement>('[data-mermaid]');
  const action = button.dataset.mermaidAction;
  if (!figure || !action) return;
  event.preventDefault();
  applyAction(figure, action);
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  const expanded = document.querySelector<HTMLElement>('.a-mermaid.is-expanded');
  if (expanded) {
    unlockFallback(expanded);
    refreshView(expanded);
  }
}

function localPoint(viewport: HTMLElement, event: PointerEvent | WheelEvent): Point {
  const rect = viewport.getBoundingClientRect();
  return {
    x: event.clientX - rect.left - rect.width / 2,
    y: event.clientY - rect.top - rect.height / 2,
  };
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function suppressNextClick(viewport: HTMLElement): void {
  const handler = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  viewport.addEventListener('click', handler, true);
  window.setTimeout(() => viewport.removeEventListener('click', handler, true), 0);
}

function bindViewport(figure: HTMLElement): void {
  const viewport = viewportOf(figure);
  if (!viewport || viewportBound.has(viewport)) return;
  viewportBound.add(viewport);

  let gesture: Gesture | null = null;

  const startGesture = (): Gesture => {
    const points = [...(gesture?.pointers.values() ?? [])];
    const first = points[0] ?? { x: 0, y: 0 };
    return {
      pointers: gesture?.pointers ?? new Map<number, Point>(),
      startView: readView(figure),
      startPoint: first,
      startMid: points[1] ? midpoint(first, points[1]) : first,
      startDistance: points[1] ? distance(first, points[1]) : 0,
      dragging: false,
    };
  };

  viewport.addEventListener('pointerdown', (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!gesture) gesture = startGesture();
    if (gesture.pointers.size >= 2) return;
    const point = localPoint(viewport, event);
    gesture.pointers.set(event.pointerId, point);
    try {
      viewport.setPointerCapture(event.pointerId);
    } catch {
      // 某些浏览器/输入设备不支持隐式指针捕获；事件仍可在 viewport 上继续冒泡。
    }
    if (gesture.pointers.size === 1) {
      gesture.startView = readView(figure);
      gesture.startPoint = point;
      gesture.startMid = point;
      gesture.startDistance = 0;
      gesture.dragging = false;
    } else {
      const points = [...gesture.pointers.values()];
      gesture.startView = readView(figure);
      gesture.startMid = midpoint(points[0], points[1]);
      gesture.startDistance = distance(points[0], points[1]);
      gesture.dragging = false;
    }
  });

  viewport.addEventListener('pointermove', (event: PointerEvent) => {
    if (!gesture?.pointers.has(event.pointerId)) return;
    const point = localPoint(viewport, event);
    gesture.pointers.set(event.pointerId, point);

    if (gesture.pointers.size === 1) {
      const dx = point.x - gesture.startPoint.x;
      const dy = point.y - gesture.startPoint.y;
      if (!gesture.dragging && Math.hypot(dx, dy) < 3) return;
      gesture.dragging = true;
      figure.dataset.mermaidPanning = 'true';
      setView(figure, { scale: gesture.startView.scale, x: gesture.startView.x + dx, y: gesture.startView.y + dy });
      event.preventDefault();
      return;
    }

    const points = [...gesture.pointers.values()];
    if (points.length < 2 || gesture.startDistance <= 0) return;
    const mid = midpoint(points[0], points[1]);
    const ratio = distance(points[0], points[1]) / gesture.startDistance;
    const scale = clamp(gesture.startView.scale * ratio, MIN_SCALE, MAX_SCALE);
    const scaleRatio = scale / gesture.startView.scale;
    gesture.dragging = true;
    figure.dataset.mermaidPanning = 'true';
    setView(figure, {
      scale,
      x: mid.x - scaleRatio * (gesture.startMid.x - gesture.startView.x),
      y: mid.y - scaleRatio * (gesture.startMid.y - gesture.startView.y),
    });
    event.preventDefault();
  });

  const endPointer = (event: PointerEvent): void => {
    if (!gesture) return;
    const wasDragging = gesture.dragging;
    gesture.pointers.delete(event.pointerId);
    try {
      viewport.releasePointerCapture(event.pointerId);
    } catch {
      // 指针已经释放或从未被捕获。
    }

    if (gesture.pointers.size === 0) {
      gesture = null;
      delete figure.dataset.mermaidPanning;
      if (wasDragging) suppressNextClick(viewport);
      return;
    }

    const remaining = [...gesture.pointers.values()][0];
    gesture.startView = readView(figure);
    gesture.startPoint = remaining;
    gesture.startMid = remaining;
    gesture.startDistance = 0;
    gesture.dragging = false;
  };

  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      if (figure.dataset.mermaidState !== 'done') return;
      event.preventDefault();
      let delta = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
      else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= 100;
      const current = readView(figure);
      zoomAround(figure, current.scale * Math.exp(-delta * 0.0015), localPoint(viewport, event));
    },
    { passive: false },
  );
  viewport.addEventListener('dragstart', (event) => event.preventDefault());
}

function bindWindowResize(): void {
  if (resizeBound) return;
  resizeBound = true;
  window.addEventListener('resize', () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      for (const figure of document.querySelectorAll<HTMLElement>('[data-mermaid]')) {
        setView(figure, readView(figure));
      }
    });
  });
}

function bindControls(): void {
  if (controlsBound) return;
  controlsBound = true;
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('fullscreenchange', syncAllFullscreen);
}

async function renderFigure(figure: HTMLElement, force: boolean): Promise<void> {
  if (!force && figure.dataset.mermaidState === 'done') return;

  bindViewport(figure);
  const source = figure.querySelector<HTMLElement>('.a-mermaid-source');
  const canvas = canvasOf(figure);
  const error = figure.querySelector<HTMLElement>('.a-mermaid-error');
  const tools = toolsOf(figure);
  if (!source || !canvas || !error) return;

  const code = source.textContent ?? '';
  if (!code.trim()) return;

  figure.dataset.mermaidState = 'rendering';
  if (tools) tools.hidden = true;
  error.hidden = true;
  canvas.replaceChildren();

  const id = `mermaid-${Date.now().toString(36)}-${(++renderSequence).toString(36)}`;
  try {
    const mermaid = await ensureMermaid();
    const { svg } = await mermaid.render(id, code);
    if (!svg) throw new Error('empty mermaid output');
    canvas.innerHTML = svg;
    figure.dataset.mermaidState = 'done';
    error.hidden = true;
    resetView(figure);
    if (tools) tools.hidden = false;
    syncFullscreenButton(figure);
  } catch {
    figure.dataset.mermaidState = 'error';
    error.hidden = false;
    canvas.replaceChildren();
    resetView(figure);
    if (tools) tools.hidden = true;
  } finally {
    for (const temporary of [document.getElementById(id), document.getElementById(`d${id}`)]) {
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
  bindControls();
  bindWindowResize();
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
