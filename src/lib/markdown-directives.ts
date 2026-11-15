import type { Element, ElementContent, Root as HastRoot, Properties } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import type { Blockquote, Code, List, ListItem, Paragraph, PhrasingContent, Root, RootContent } from 'mdast';
import type { Position } from 'unist';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { parse as parseYaml } from 'yaml';

import type { FormatParams } from '../i18n/format';
import type { SiteLang } from '../i18n/languages';
import type { MessageKey } from '../i18n/locale-types';
import { translate } from '../i18n/translate';
import { escapeHtml } from './html-escape';
import { type AlertType, alertIcon } from './markdown-alert-icons';
import type { MetingPlayerType } from './meting-core';
import { type MusicTrack, normalizePlaylist } from './music';
import { renderMusicPlayerHtml } from './music-player-html';

/**
 * remark-directive 的落地实现。
 *
 * 所有指令先转成 mdast 已知节点，再通过 hName / hProperties / hChildren
 * 交给 mdast-util-to-hast；这样 .md 与 .mdx 共用同一套输出，不依赖 raw HTML。
 */

type Translator = (key: MessageKey, params?: FormatParams) => string;

interface DirectiveData {
  hName?: string;
  hProperties?: Properties;
  hChildren?: ElementContent[];
  directiveLabel?: boolean;
  [key: string]: unknown;
}

interface MutableDirective {
  type: string;
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
  children: RootContent[];
  label?: string | null;
  position?: Position;
  data?: DirectiveData;
}

const CONTAINER_NAMES = new Set(['note', 'tip', 'important', 'warning', 'caution', 'fold', 'music', 'timeline', 'event']);
const LEAF_NAMES = new Set(['github', 'youtube', 'bilibili', 'meting', 'hr']);
const TEXT_NAMES = new Set(['underline', 'ins', 'kbd', 'hidden', 'abbr']);

const ALERT_TYPES = new Set<AlertType>(['note', 'tip', 'important', 'warning', 'caution']);

const ALERT_TITLE_KEYS: Record<AlertType, MessageKey> = {
  note: 'markdown.alertNote',
  tip: 'markdown.alertTip',
  important: 'markdown.alertImportant',
  warning: 'markdown.alertWarning',
  caution: 'markdown.alertCaution',
};

const UNDERLINE_TYPES = new Set(['line', 'wavy', 'dot', 'dashed', 'double']);
const HIDDEN_TYPES = new Set(['blur', 'background']);
const GITHUB_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const BILIBILI_ID = /^BV[0-9A-Za-z]{10}$/;
const METING_TOKEN = /^[A-Za-z0-9_-]+$/;
const TIMELINE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function mutable(node: unknown): MutableDirective {
  return node as MutableDirective;
}

function attr(node: MutableDirective, name: string): string | undefined {
  const value = node.attributes?.[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function fail(file: VFile, node: MutableDirective, message: string): never {
  return file.fail('[daybook:markdown] ' + message, node.position);
}

function warn(file: VFile, node: MutableDirective, message: string): void {
  file.message('[daybook:markdown] ' + message, node.position);
}

function iconSvg(name: string, className = 'a-ico'): string {
  return (
    '<svg class="' +
    escapeHtml(className) +
    '" aria-hidden="true" focusable="false"><use href="#' +
    escapeHtml(name) +
    '"></use></svg>'
  );
}

function htmlAttrs(entries: Record<string, string | number | boolean | undefined>): string {
  let output = '';
  for (const [key, value] of Object.entries(entries)) {
    if (value === true) {
      output += ' ' + key;
      continue;
    }
    if (value === false || value === undefined) continue;
    output += ' ' + key + '="' + escapeHtml(String(value)) + '"';
  }
  return output;
}

function firstElement(html: string): Element {
  const tree = fromHtml(html, { fragment: true });
  const found = tree.children.find((child): child is Element => child.type === 'element');
  if (!found) throw new Error('[daybook:markdown] generated HTML has no element');
  return found;
}

function setHtmlNode(node: MutableDirective, html: string): void {
  const element = firstElement(html);
  node.type = 'paragraph';
  node.children = [];
  node.data = {
    ...(node.data ?? {}),
    hName: element.tagName,
    hProperties: element.properties,
    hChildren: element.children,
  };
}

function htmlBlock(html: string): Paragraph {
  const element = firstElement(html);
  return {
    type: 'paragraph',
    children: [],
    data: {
      hName: element.tagName,
      hProperties: element.properties,
      hChildren: element.children,
    },
  };
}

function setInlineNode(node: MutableDirective, tagName: string, className: string, extra: Properties = {}): void {
  node.type = 'emphasis';
  node.data = {
    ...(node.data ?? {}),
    hName: tagName,
    hProperties: { ...extra, className: [className] },
  };
}

function replaceWithChildren(node: MutableDirective, parent: { children: RootContent[] } | undefined, index: number): number {
  if (!parent) return index;
  parent.children.splice(index, 1, ...node.children);
  return index;
}

function isDirectiveLabel(node: RootContent): node is Paragraph {
  return node.type === 'paragraph' && (node.data as { directiveLabel?: boolean } | undefined)?.directiveLabel === true;
}

function containerParts(node: MutableDirective): { label?: Paragraph; body: RootContent[] } {
  const label = node.children.find(isDirectiveLabel);
  return {
    label,
    body: node.children.filter((child) => child !== label),
  };
}

function labelParagraph(
  label: Paragraph | undefined,
  text: string,
  className: string,
  tagName = 'p',
  icon?: AlertType,
): Paragraph {
  const children: PhrasingContent[] = label ? [...label.children] : [{ type: 'text', value: text }];
  if (icon) children.unshift(alertIcon(icon));
  return {
    type: 'paragraph',
    data: {
      hName: tagName,
      hProperties: { className: [className] },
    },
    children,
  };
}

function wrongLevel(file: VFile, node: MutableDirective, expected: string): never {
  return fail(file, node, node.name + ' 是 ' + expected + ' 指令，请调整冒号数量。');
}

function setAlert(node: MutableDirective, lang: SiteLang): void {
  const { label, body } = containerParts(node);
  const type = node.name as AlertType;
  if (!ALERT_TYPES.has(type)) return;

  node.type = 'blockquote';
  node.children = [labelParagraph(label, translate(lang, ALERT_TITLE_KEYS[type]), 'a-md-alert-title', 'p', type), ...body];
  node.data = {
    ...(node.data ?? {}),
    hName: 'blockquote',
    hProperties: { className: ['a-md-alert', 'a-md-alert--' + type] },
  };
}

function setFold(node: MutableDirective, lang: SiteLang): void {
  const { label, body } = containerParts(node);
  node.type = 'blockquote';
  node.children = [labelParagraph(label, translate(lang, 'markdown.fold'), 'a-md-fold-summary', 'summary'), ...body];
  node.data = {
    ...(node.data ?? {}),
    hName: 'details',
    hProperties: { className: ['a-md-fold'] },
  };
}

function parseBoolean(node: MutableDirective, file: VFile, name: string): boolean {
  const value = attr(node, name);
  if (value === undefined) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fail(file, node, name + ' 只接受 true 或 false。');
}

function musicFromYaml(node: MutableDirective, file: VFile, tr: Translator): void {
  const raw = String(file.value ?? '');
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) {
    fail(file, node, '无法读取 :::music 的原始内容。');
  }

  const lines = raw.slice(start, end).split(/\r?\n/);
  if (lines.length < 2) fail(file, node, ':::music 需要 YAML 列表内容。');
  lines.shift();
  if ((lines[lines.length - 1] ?? '').trim() !== ':::') {
    fail(file, node, ':::music 缺少结束标记 :::。');
  }
  lines.pop();

  let parsed: unknown;
  try {
    parsed = parseYaml(lines.join('\n'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(file, node, ':::music 的 YAML 解析失败：' + message);
  }
  if (!Array.isArray(parsed)) fail(file, node, ':::music 必须包含 YAML 列表。');

  let tracks: MusicTrack[];
  try {
    tracks = normalizePlaylist(parsed as unknown as MusicTrack[]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(file, node, ':::music ' + message.replace('[daybook:music] ', ''));
  }

  try {
    setHtmlNode(node, renderMusicPlayerHtml({ playlist: tracks }, tr));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(file, node, message);
  }
}

function githubCard(node: MutableDirective, file: VFile, tr: Translator): void {
  const repo = attr(node, 'repo');
  if (!repo) fail(file, node, '::github 需要 repo="owner/repo"。');
  if (!GITHUB_REPO.test(repo)) fail(file, node, '::github 的 repo 必须是 owner/repo。');

  const [owner, name] = repo.split('/');
  const href = 'https://github.com/' + repo;
  const label = tr('markdown.githubView', { repo });
  const fallback = tr('markdown.githubFallback');
  const stars = tr('markdown.githubStars');
  const forks = tr('markdown.githubForks');
  const license = tr('markdown.githubLicense');

  const avatar =
    '<span class="a-md-github-avatar" aria-hidden="true">' +
    '<img class="a-md-github-avatar-img" data-github-avatar alt="" width="56" height="56" hidden>' +
    iconSvg('i-github', 'a-ico a-md-github-avatar-ico') +
    '</span>';

  const head =
    '<span class="a-md-github-head">' +
    avatar +
    '<span class="a-md-github-name"><span class="a-md-github-owner">' +
    escapeHtml(owner) +
    '</span><span class="a-md-github-slash" aria-hidden="true">/</span><span class="a-md-github-repo">' +
    escapeHtml(name) +
    '</span></span>' +
    iconSvg('i-github', 'a-ico a-md-github-ico') +
    '</span>';

  const stats =
    '<span class="a-md-github-meta">' +
    '<span class="a-md-github-stat">' +
    iconSvg('i-star', 'a-ico a-md-github-stat-ico') +
    '<span data-github-stars>—</span><span class="a-sr">' +
    escapeHtml(stars) +
    '</span></span>' +
    '<span class="a-md-github-stat">' +
    iconSvg('i-fork', 'a-ico a-md-github-stat-ico') +
    '<span data-github-forks>—</span><span class="a-sr">' +
    escapeHtml(forks) +
    '</span></span>' +
    '<span class="a-md-github-stat">' +
    iconSvg('i-scale', 'a-ico a-md-github-stat-ico') +
    '<span data-github-license>—</span><span class="a-sr">' +
    escapeHtml(license) +
    '</span></span>' +
    '</span>';

  const html =
    '<a' +
    htmlAttrs({
      class: 'a-md-github',
      'data-github-card': true,
      'data-github-repo': repo,
      href,
      target: '_blank',
      rel: 'noopener',
      'aria-label': label,
    }) +
    '>' +
    head +
    '<span class="a-md-github-desc" data-github-description>' +
    escapeHtml(fallback) +
    '</span>' +
    stats +
    '</a>';

  setHtmlNode(node, html);
}

function videoEmbed(node: MutableDirective, file: VFile, tr: Translator, provider: 'youtube' | 'bilibili'): void {
  const id = attr(node, 'id');
  if (!id) fail(file, node, '::' + provider + ' 需要 id。');
  if (provider === 'youtube' && !YOUTUBE_ID.test(id)) {
    fail(file, node, '::youtube 的 id 不合法。');
  }
  if (provider === 'bilibili' && !BILIBILI_ID.test(id)) {
    fail(file, node, '::bilibili 的 id 必须是 BV 号。');
  }

  const autoloadValue = attr(node, 'autoload');
  if (autoloadValue !== undefined && autoloadValue !== 'true' && autoloadValue !== 'false') {
    fail(file, node, '::' + provider + ' 的 autoload 只接受 true 或 false。');
  }
  const autoload = autoloadValue !== 'false';

  const label = provider === 'youtube' ? tr('markdown.youtubeLabel') : tr('markdown.bilibiliLabel');
  const play = provider === 'youtube' ? tr('markdown.youtubePlay') : tr('markdown.bilibiliPlay');
  const href = provider === 'youtube' ? 'https://www.youtube.com/watch?v=' + id : 'https://www.bilibili.com/video/' + id;

  const poster =
    provider === 'youtube'
      ? '<img class="a-md-embed-poster" src="https://i.ytimg.com/vi/' +
        escapeHtml(id) +
        '/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
      : '';

  const extra = provider === 'bilibili' ? '<span class="a-md-embed-id">' + escapeHtml(id) + '</span>' : '';

  const facade =
    '<a' +
    htmlAttrs({
      class: 'a-md-embed-facade',
      'data-embed-facade': true,
      href,
      target: '_blank',
      rel: 'noopener',
      'aria-label': play,
    }) +
    '>' +
    poster +
    '<span class="a-md-embed-shade" aria-hidden="true"></span>' +
    '<span class="a-md-embed-play" aria-hidden="true">' +
    iconSvg('i-play') +
    '</span>' +
    '<span class="a-md-embed-label">' +
    escapeHtml(label) +
    '</span>' +
    extra +
    '</a>';

  const html =
    '<figure' +
    htmlAttrs({
      class: 'a-md-embed',
      'data-embed': true,
      'data-embed-provider': provider,
      'data-embed-id': id,
      'data-embed-title': play,
      'data-embed-autoload': autoload ? undefined : 'false',
    }) +
    '>' +
    facade +
    '</figure>';

  setHtmlNode(node, html);
}

function metingPlayer(node: MutableDirective, file: VFile, tr: Translator): void {
  const id = attr(node, 'id');
  if (!id) fail(file, node, '::meting 需要 id。');
  if (!METING_TOKEN.test(id)) fail(file, node, '::meting 的 id 只能包含字母、数字、下划线和短横线。');

  const server = attr(node, 'server') ?? 'netease';
  if (!METING_TOKEN.test(server)) fail(file, node, '::meting 的 server 只能包含字母、数字、下划线和短横线。');

  const type = (attr(node, 'type') ?? 'playlist') as MetingPlayerType;
  if (type !== 'song' && type !== 'playlist' && type !== 'albumlist') {
    fail(file, node, '::meting 的 type 只能是 song、playlist 或 albumlist。');
  }

  const autoPlayNext = parseBoolean(node, file, 'autoPlayNext');
  const playlistExpand = parseBoolean(node, file, 'playlistExpand');

  try {
    setHtmlNode(
      node,
      renderMusicPlayerHtml(
        {
          metingSource: { query: { server, type, id } },
          autoPlayNext,
          playlistExpand,
        },
        tr,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(file, node, message);
  }
}

function thematicBreak(node: MutableDirective): void {
  const raw = attr(node, 'class') ?? '';
  const classes = ['a-md-hr', ...raw.split(/\s+/).filter(Boolean)]
    .filter((value, index, list) => list.indexOf(value) === index)
    .filter((value) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value));
  setHtmlNode(node, '<hr' + htmlAttrs({ class: classes.join(' ') }) + '>');
}

function findNestedTimeline(nodes: RootContent[]): MutableDirective | undefined {
  for (const child of nodes) {
    if (child.type === 'containerDirective') {
      const directive = mutable(child);
      if (directive.name === 'timeline' || directive.name === 'event') return directive;
    }
    const children = (child as { children?: unknown }).children;
    if (Array.isArray(children)) {
      const nested = findNestedTimeline(children as RootContent[]);
      if (nested) return nested;
    }
  }
  return undefined;
}

function timelineDate(value: string, file: VFile, node: MutableDirective): { iso: string; label: string; year: string } {
  const match = TIMELINE_DATE.exec(value);
  if (!match) fail(file, node, ':::event 的 date 必须写成 YYYY-MM-DD。');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    fail(file, node, ':::event 的 date 不是有效日期：' + value + '。');
  }
  return { iso: value, label: match[2] + '.' + match[3], year: match[1] };
}

function setTimeline(node: MutableDirective, file: VFile): void {
  const start = node.position?.start.offset;
  if (start !== undefined) {
    const raw = String(file.value ?? '');
    const lineEnd = raw.indexOf('\n', start);
    const opening = raw.slice(start, lineEnd === -1 ? undefined : lineEnd).trimStart();
    if (!opening.startsWith('::::timeline')) {
      fail(file, node, '::::timeline 的外层需要使用 4 个冒号，内层 :::event 使用 3 个。');
    }
  }
  if (Object.keys(node.attributes ?? {}).length > 0) {
    fail(file, node, '::::timeline 不接受属性。');
  }

  const { label, body } = containerParts(node);
  if (label) fail(file, node, '::::timeline 不支持自定义标题。');
  if (body.length === 0) fail(file, node, '::::timeline 至少需要一个 :::event。');

  const items: ListItem[] = [];
  for (const child of body) {
    if (child.type !== 'containerDirective') {
      fail(file, node, '::::timeline 里只能放 :::event。');
    }
    const event = mutable(child);
    if (event.name === 'timeline') {
      fail(file, event, '::::timeline 不能嵌套。');
    }
    if (event.name !== 'event') {
      fail(file, event, '::::timeline 里只能放 :::event，不能放 :::' + event.name + '。');
    }

    const { label: eventLabel, body: eventBody } = containerParts(event);
    if (eventLabel) {
      fail(file, event, ':::event 不支持 [标题] 写法，请使用 title 属性。');
    }
    const unknown = Object.keys(event.attributes ?? {}).filter((name) => name !== 'date' && name !== 'title');
    if (unknown.length > 0) {
      fail(file, event, ':::event 不支持属性 ' + unknown.join('、') + '，只接受 date 与 title。');
    }
    const value = attr(event, 'date');
    if (!value) fail(file, event, ':::event 缺少 date 属性。');
    const parsed = timelineDate(value, file, event);

    const nested = findNestedTimeline(eventBody);
    if (nested) fail(file, nested, '::::timeline 与 :::event 不能嵌套。');

    const title = attr(event, 'title');
    const dateBlock = htmlBlock(
      '<div' +
        htmlAttrs({ class: 'a-tl-date' }) +
        '><time' +
        htmlAttrs({ datetime: parsed.iso }) +
        '>' +
        escapeHtml(parsed.label) +
        '</time><span>' +
        escapeHtml(parsed.year) +
        '</span></div>',
    );
    const nodeBlock: Paragraph = {
      type: 'paragraph',
      children: [],
      data: {
        hName: 'span',
        hProperties: { className: ['a-tl-node'], ariaHidden: 'true' },
      },
    };
    const bodyBlock: Blockquote = {
      type: 'blockquote',
      children: eventBody as Blockquote['children'],
      data: {
        hName: 'div',
        hProperties: { className: ['a-tl-body'] },
      },
    };
    const contentChildren: Blockquote['children'] = [];
    if (title) {
      contentChildren.push({
        type: 'paragraph',
        children: [{ type: 'text', value: title }],
        data: {
          hName: 'p',
          hProperties: { className: ['a-tl-title'] },
        },
      });
    }
    contentChildren.push(bodyBlock);
    const content: Blockquote = {
      type: 'blockquote',
      children: contentChildren,
      data: {
        hName: 'div',
        hProperties: { className: ['a-tl-content'] },
      },
    };

    items.push({
      type: 'listItem',
      spread: false,
      children: [dateBlock, nodeBlock, content],
      data: {
        hName: 'li',
        hProperties: { className: ['a-tl-item'] },
      },
    });
  }

  const list = node as unknown as List;
  list.type = 'list';
  list.ordered = true;
  list.start = 1;
  list.spread = false;
  list.children = items;
  list.data = {
    ...(list.data ?? {}),
    hName: 'ol',
    hProperties: { className: ['a-timeline'] },
  };
}

function handleContainer(
  node: MutableDirective,
  file: VFile,
  lang: SiteLang,
  parent: { children: RootContent[] } | undefined,
  index: number,
): number | undefined {
  if (LEAF_NAMES.has(node.name)) wrongLevel(file, node, '叶子（::name）');
  if (TEXT_NAMES.has(node.name)) wrongLevel(file, node, '文本（:name）');

  switch (node.name) {
    case 'note':
    case 'tip':
    case 'important':
    case 'warning':
    case 'caution':
      setAlert(node, lang);
      return;
    case 'fold':
      setFold(node, lang);
      return;
    case 'music':
      musicFromYaml(node, file, (key, params) => translate(lang, key, params));
      return;
    case 'timeline':
      setTimeline(node, file);
      return;
    case 'event':
      return fail(file, node, ':::event 只能放在 ::::timeline 里。');
    default:
      warn(file, node, '未知容器指令 :::' + node.name + '，已按普通内容输出。');
      return replaceWithChildren(node, parent, index);
  }
}

function handleLeaf(
  node: MutableDirective,
  file: VFile,
  tr: Translator,
  parent: { children: RootContent[] } | undefined,
  index: number,
): number | undefined {
  if (CONTAINER_NAMES.has(node.name)) wrongLevel(file, node, '容器（:::name ... :::）');
  if (TEXT_NAMES.has(node.name)) wrongLevel(file, node, '文本（:name）');

  switch (node.name) {
    case 'github':
      githubCard(node, file, tr);
      return;
    case 'youtube':
      videoEmbed(node, file, tr, 'youtube');
      return;
    case 'bilibili':
      videoEmbed(node, file, tr, 'bilibili');
      return;
    case 'meting':
      metingPlayer(node, file, tr);
      return;
    case 'hr':
      thematicBreak(node);
      return;
    default:
      warn(file, node, '未知叶子指令 ::' + node.name + '，已忽略。');
      return replaceWithChildren(node, parent, index);
  }
}

function handleText(
  node: MutableDirective,
  file: VFile,
  parent: { children: RootContent[] } | undefined,
  index: number,
): number | undefined {
  if (CONTAINER_NAMES.has(node.name)) wrongLevel(file, node, '容器（:::name ... :::）');
  if (LEAF_NAMES.has(node.name)) wrongLevel(file, node, '叶子（::name）');

  switch (node.name) {
    case 'underline':
    case 'ins': {
      const type = attr(node, 'type') ?? 'line';
      if (!UNDERLINE_TYPES.has(type)) fail(file, node, ':' + node.name + ' 的 type 只能是 line、wavy、dot、dashed 或 double。');
      setInlineNode(node, node.name === 'ins' ? 'ins' : 'u', 'a-md-underline', { dataType: type });
      return;
    }
    case 'kbd':
      setInlineNode(node, 'kbd', 'a-md-kbd');
      return;
    case 'hidden': {
      const type = attr(node, 'type') ?? 'blur';
      if (!HIDDEN_TYPES.has(type)) fail(file, node, ':hidden 的 type 只能是 blur 或 background。');
      setInlineNode(node, 'span', 'a-md-hidden', { dataType: type, tabIndex: 0 });
      return;
    }
    case 'abbr': {
      const title = attr(node, 'title');
      if (!title) warn(file, node, ':abbr 缺少 title 属性。');
      setInlineNode(node, 'abbr', 'a-md-abbr', title ? { title } : {});
      return;
    }
    default:
      warn(file, node, '未知文本指令 :' + node.name + '，已按普通内容输出。');
      return replaceWithChildren(node, parent, index);
  }
}

export function remarkDirectives(lang: SiteLang) {
  const tr: Translator = (key, params) => translate(lang, key, params);

  return (tree: Root, file: VFile): void => {
    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;
      const directive = mutable(node);

      if (node.type === 'containerDirective') {
        return handleContainer(directive, file, lang, parent, index);
      }
      if (node.type === 'leafDirective') {
        return handleLeaf(directive, file, tr, parent, index);
      }
      if (node.type === 'textDirective') {
        return handleText(directive, file, parent, index);
      }
      return;
    });
  };
}

function textContent(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return (node.children ?? []).map(textContent).join('');
  return '';
}

function isFootnoteRef(node: Element): boolean {
  const properties = node.properties ?? {};
  return 'dataFootnoteRef' in properties || 'data-footnote-ref' in properties;
}

export function rehypeFootnoteRefs(lang: SiteLang) {
  return (tree: HastRoot): void => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a' || !isFootnoteRef(node)) return;
      const current = node.children ?? [];
      const number = textContent(node).replace(/[[\]\s]/g, '') || '1';
      const first = current[0];
      const last = current[current.length - 1];
      const hasBrackets =
        first?.type === 'text' && first.value.startsWith('[') && last?.type === 'text' && last.value.endsWith(']');
      if (!hasBrackets) {
        node.children = [{ type: 'text', value: '[' }, ...current, { type: 'text', value: ']' }];
      }
      const properties = { ...(node.properties ?? {}) };
      delete properties.ariaDescribedBy;
      properties.ariaLabel = translate(lang, 'markdown.footnoteRef', { number });
      node.properties = properties;
    });
  };
}

function mermaidTool(action: string, icon: string, label: string, extra: Record<string, string> = {}): string {
  return (
    '<button type="button"' +
    htmlAttrs({
      class: 'a-mermaid-tool',
      'data-mermaid-action': action,
      'aria-label': label,
      title: label,
      ...extra,
    }) +
    '>' +
    iconSvg(icon) +
    '</button>'
  );
}

export function remarkMermaid(lang: SiteLang) {
  return (tree: Root): void => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;
      const fullscreen = translate(lang, 'markdown.mermaidFullscreen');
      const close = translate(lang, 'markdown.mermaidClose');
      const tools =
        '<div class="a-mermaid-tools" data-mermaid-tools hidden>' +
        mermaidTool('zoom-in', 'i-plus', translate(lang, 'markdown.mermaidZoomIn')) +
        mermaidTool('zoom-out', 'i-minus', translate(lang, 'markdown.mermaidZoomOut')) +
        mermaidTool('reset', 'i-reset', translate(lang, 'markdown.mermaidReset')) +
        mermaidTool('fullscreen', 'i-expand', fullscreen, {
          'data-label-fullscreen': fullscreen,
          'data-label-close': close,
        }) +
        '</div>';
      const html =
        '<figure class="a-mermaid" data-mermaid>' +
        tools +
        '<pre class="a-mermaid-source">' +
        escapeHtml(node.value) +
        '</pre>' +
        '<div class="a-mermaid-viewport" data-mermaid-viewport>' +
        '<div class="a-mermaid-canvas"></div>' +
        '</div>' +
        '<p class="a-mermaid-error" hidden>' +
        escapeHtml(translate(lang, 'markdown.mermaidError')) +
        '</p>' +
        '<figcaption class="a-sr">' +
        escapeHtml(translate(lang, 'markdown.mermaidLabel')) +
        '</figcaption>' +
        '</figure>';
      const element = firstElement(html);
      const replacement: Paragraph = {
        type: 'paragraph',
        children: [],
        data: {
          hName: element.tagName,
          hProperties: element.properties,
          hChildren: element.children,
        },
      };
      parent.children.splice(index, 1, replacement);
      return index;
    });
  };
}
