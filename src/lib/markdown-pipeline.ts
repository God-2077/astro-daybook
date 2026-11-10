import type { RehypePlugins, RemarkPlugins } from '@astrojs/markdown-remark';
import type { MarkdownHeading } from 'astro';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';

import type { SiteLang } from '../i18n/languages';
import { remarkAlerts } from './markdown-alerts';
import { rehypeFootnoteRefs, remarkDirectives, remarkMermaid } from './markdown-directives';

import { isExternalUrl } from './site';

/**
 * Markdown / MDX 共用的正文管线。
 *
 * 详情页、首页日记、RSS 全文、独立页面与 MDX 都从这里取插件配置，
 * 保证 `.md` 与 `.mdx` 产出的 DOM 结构一致（✦ 小标题、figure、a-table-wrap 等）。
 */

/** 极简 hast 结构，避免为几个字段引入额外依赖。 */
interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

type HastProperties = NonNullable<HastNode['properties']>;

function element(tagName: string, properties: HastProperties = {}, children: HastNode[] = []): HastNode {
  return { type: 'element', tagName, properties, children };
}

function isElement(node: HastNode): boolean {
  return node.type === 'element' && typeof node.tagName === 'string';
}

function isMdxJsxNode(node: HastNode): boolean {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

function classNames(node: HastNode): string[] {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  return [];
}

function hasClass(node: HastNode, name: string): boolean {
  return classNames(node).includes(name);
}

function setClassNames(node: HastNode, names: string[]): void {
  node.properties = { ...node.properties, className: names };
}

/** 正文 h2 前的 ✦ 装饰（原型 `.a-h2-star`，hover 时旋转由 CSS 负责）。 */
function starNode(): HastNode {
  return element('svg', { className: ['a-h2-star'], ariaHidden: 'true', focusable: 'false' }, [
    element('use', { href: '#i-star' }),
  ]);
}

/** GFM 脚注区块：去掉可见的 "Footnotes" 标题，换成原型的 `.a-footnotes` 类名。 */
function normalizeFootnotes(node: HastNode): void {
  const properties = node.properties ?? {};
  const isFootnotes = Object.keys(properties).some((key) => key.toLowerCase().replace(/-/g, '') === 'datafootnotes');
  if (!isFootnotes && !hasClass(node, 'footnotes')) return;

  const children = node.children ?? [];
  node.children = children.filter((child) => !(isElement(child) && child.tagName === 'h2'));
  setClassNames(node, ['a-footnotes']);
  const ol = node.children.find((child) => isElement(child) && child.tagName === 'ol');
  if (ol) setClassNames(ol, ['a-footnote-list']);
}

/** 位图有内禀宽高比，可以安全地限高缩放；SVG 没有内禀尺寸，必须保持满栏宽度。 */
function isRasterImage(img: HastNode): boolean {
  const src = img.properties?.src;
  if (typeof src !== 'string') return true;
  return !/\.svg$/i.test(src.split(/[?#]/)[0] ?? '');
}

/** 单图段落 → 原型 `<figure class="a-figure">` + 由 alt 生成的图注。 */
function toFigure(img: HastNode, alt: string): HastNode {
  const caption = alt.trim();
  const figureClasses = ['a-figure'];
  if (isRasterImage(img)) figureClasses.push('a-figure--raster');
  const figureChildren: HastNode[] = [element('div', { className: ['a-frame'] }, [img])];
  if (caption.length > 0) {
    figureChildren.push(element('figcaption', {}, [{ type: 'text', value: caption }]));
  }
  return element('figure', { className: figureClasses }, figureChildren);
}

/** 正文图片统一懒加载 + 异步解码，并挂 `a-img` 便于骨架屏样式定位。 */
function decorateImage(img: HastNode): void {
  const names = classNames(img);
  // 指令生成的封面/头像/播放器图片有各自的比例与可见性，不套正文图片骨架。
  if (names.some((name) => name === 'a-md-github-avatar-img' || name === 'a-md-embed-poster' || name === 'a-music-cover-img')) {
    return;
  }
  if (!names.includes('a-img')) names.push('a-img');
  const properties = img.properties ?? {};
  img.properties = {
    ...properties,
    className: names,
    loading: typeof properties.loading === 'string' ? properties.loading : 'lazy',
    decoding: 'async',
  };
}

/** 段落里的一行：软换行与硬换行之间的节点；`break` 记录该行后面的换行类型。 */
interface ProseLine {
  nodes: HastNode[];
  break?: 'soft' | 'hard';
}

function isImage(node: HastNode): boolean {
  return isElement(node) && node.tagName === 'img';
}

/** 按软换行（文本里的 \n）与硬换行（`<br>`）把段落的子节点切成若干行。 */
function splitLines(children: HastNode[]): ProseLine[] {
  let current: ProseLine = { nodes: [] };
  const lines: ProseLine[] = [current];

  const breakLine = (kind: 'soft' | 'hard'): void => {
    current.break = kind;
    current = { nodes: [] };
    lines.push(current);
  };

  for (const child of children) {
    if (isElement(child) && child.tagName === 'br') {
      breakLine('hard');
      continue;
    }
    if (child.type !== 'text') {
      current.nodes.push(child);
      continue;
    }
    const parts = (child.value ?? '').split('\n');
    for (const [index, part] of parts.entries()) {
      if (index > 0) breakLine('soft');
      if (part.length > 0) current.nodes.push({ type: 'text', value: part });
    }
  }
  return lines;
}

/** 整行只有图片与空白时返回这一行的图片，否则返回 undefined。 */
function lineImages(line: ProseLine): HastNode[] | undefined {
  const nodes = line.nodes.filter((node) => !(node.type === 'text' && (node.value ?? '').trim().length === 0));
  if (nodes.length === 0 || !nodes.every(isImage)) return undefined;
  return nodes;
}

/** 独占一行的图片 → figure，图注仍取 alt。 */
function imageFigure(img: HastNode): HastNode {
  decorateImage(img);
  const alt = typeof img.properties?.alt === 'string' ? img.properties.alt : '';
  return toFigure(img, alt);
}

/** 同一行的多张图片 → 并排行容器，每张图各自保留细框与图注。 */
function imageRow(images: HastNode[]): HastNode {
  return element('div', { className: ['a-figure-row'] }, images.map(imageFigure));
}

/**
 * 把「文字行 + 独占一行的图片」拆成段落与 figure / a-figure-row。
 * 没有独占一行的图片时返回 undefined，段落保持原样。
 */
function splitParagraph(paragraph: HastNode): HastNode[] | undefined {
  const blocks: HastNode[] = [];
  let inline: HastNode[] = [];
  let pendingBreak: ProseLine['break'];
  let hasImages = false;

  // 块之间补一个换行文本节点，与空行分隔的写法逐字节一致。
  const pushBlock = (block: HastNode): void => {
    if (blocks.length > 0) blocks.push({ type: 'text', value: '\n' });
    blocks.push(block);
  };

  const flushInline = (): void => {
    if (inline.length > 0) pushBlock(element('p', {}, inline));
    inline = [];
    pendingBreak = undefined;
  };

  for (const line of splitLines(paragraph.children ?? [])) {
    const images = lineImages(line);
    if (images) {
      hasImages = true;
      flushInline();
      pushBlock(images.length === 1 ? imageFigure(images[0]) : imageRow(images));
      continue;
    }
    if (line.nodes.length === 0) continue;
    if (inline.length > 0) {
      inline.push(pendingBreak === 'hard' ? element('br') : { type: 'text', value: '\n' });
    }
    inline.push(...line.nodes);
    pendingBreak = line.break;
  }
  flushInline();
  return hasImages ? blocks : undefined;
}

function transformChildren(parent: HastNode): void {
  const children = parent.children;
  if (!children || children.length === 0) return;

  const next: HastNode[] = [];
  for (const child of children) {
    if (isMdxJsxNode(child)) {
      transformChildren(child);
      next.push(child);
      continue;
    }

    if (!isElement(child)) {
      next.push(child);
      continue;
    }

    if (child.tagName === 'table') {
      const table = child;
      transformChildren(table);
      next.push(element('div', { className: ['a-table-wrap'] }, [table]));
      continue;
    }

    if (child.tagName === 'img') {
      decorateImage(child);
      next.push(child);
      continue;
    }

    if (child.tagName === 'p') {
      const blocks = splitParagraph(child);
      if (blocks) {
        for (const block of blocks) {
          // 重建出来的段落里可能还有 <a> 包着的行内图片，需要继续递归装饰。
          if (block.tagName === 'p') transformChildren(block);
          next.push(block);
        }
        continue;
      }
    }

    if (child.tagName === 'section') normalizeFootnotes(child);

    if (child.tagName === 'ul' && hasClass(child, 'contains-task-list')) {
      setClassNames(child, [...classNames(child), 'a-task-list']);
    }

    if (child.tagName === 'h2') {
      const current = child.children ?? [];
      const alreadyStarred =
        current.length > 0 && isElement(current[0] as HastNode) && hasClass(current[0] as HastNode, 'a-h2-star');
      if (!alreadyStarred) child.children = [starNode(), ...current];
    }

    transformChildren(child);
    next.push(child);
  }
  parent.children = next;
}

/**
 * 外链的 `rel`：保留作者已有的值，只补充 `noopener`（与站点配置里的外链一致）。
 */
function mergeRel(value: unknown): string[] {
  const list = Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [];
  if (!list.includes('noopener')) list.push('noopener');
  return list;
}

/** 站外 http(s) 链接在新标签页打开；站内绝对地址、锚点与 mailto/tel 保持原样。 */
function markExternalLinks(node: HastNode): void {
  if (isElement(node) && node.tagName === 'a') {
    const href = node.properties?.href;
    if (typeof href === 'string' && isExternalUrl(href)) {
      const properties = node.properties ?? {};
      node.properties = {
        ...properties,
        target: typeof properties.target === 'string' ? properties.target : '_blank',
        rel: mergeRel(properties.rel),
      };
    }
  }
  for (const child of node.children ?? []) markExternalLinks(child);
}

export function rehypeArticleProse() {
  return (tree: HastNode): void => {
    transformChildren(tree);
  };
}

export function rehypeExternalLinks() {
  return (tree: HastNode): void => {
    markExternalLinks(tree);
  };
}

export function createMarkdownPipeline(lang: SiteLang): {
  remarkPlugins: RemarkPlugins;
  rehypePlugins: RehypePlugins;
} {
  return {
    remarkPlugins: [remarkDirective, [remarkDirectives, lang], [remarkAlerts, lang], [remarkMermaid, lang], remarkMath],
    rehypePlugins: [
      [rehypeSlug, { prefix: 'h-' }],
      rehypeKatex,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: ['a-h2-anchor'], ariaLabel: '本节链接' },
          // 原型：h2 末尾追加 `<a class="a-h2-anchor"><svg class="a-ico"><use href="#i-link"/></svg></a>`
          content: {
            type: 'element',
            tagName: 'svg',
            properties: { className: ['a-ico'], ariaHidden: 'true', focusable: 'false' },
            children: [{ type: 'element', tagName: 'use', properties: { href: '#i-link' }, children: [] }],
          },
          test: (heading: { tagName?: string }) => heading.tagName === 'h2',
        },
      ],
      [rehypeFootnoteRefs, lang],
      rehypeArticleProse,
      rehypeExternalLinks,
    ],
  };
}

export const SHIKI_CONFIG = {
  themes: {
    light: 'github-light' as const,
    dark: 'github-dark' as const,
  },
};

export function filterHeadings(headings: MarkdownHeading[]): MarkdownHeading[] {
  // GFM 脚注会自动生成一个 "Footnotes" h2 标题，原型目录里没有它，构建 TOC 时剔除。
  return headings.filter((heading) => heading.slug !== 'footnote-label' && heading.text.trim() !== 'Footnotes');
}
