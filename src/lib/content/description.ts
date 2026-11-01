import { t } from '../../i18n/current';
import type { AnyEntry, ContentFormat } from '../../types/content';
import { contentFormat, stripMdx } from './format';

const FENCE_RE = /(^|\n)[ \t]*(```|~~~)[\s\S]*?\n[ \t]*\2/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g;
const LINK_RE = /\[([^\]]*)\]\([^)]*\)/g;
const HTML_RE = /<[^>]+>/g;
const HEADING_RE = /^[ \t]{0,3}#{1,6}[ \t]+/gm;
const LIST_RE = /^[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]+/gm;
const QUOTE_RE = /^[ \t]{0,3}>[ \t]?/gm;
const EMPHASIS_RE = /([*_~]{1,3})([^*_~]+)\1/g;
const INLINE_CODE_RE = /`([^`]*)`/g;
const MATH_RE = /(\$\$?[^$]*\$\$?)/g;

export function stripMarkdown(source: string): string {
  return source
    .replace(FENCE_RE, ' ')
    .replace(INLINE_CODE_RE, ' ')
    .replace(MATH_RE, ' ')
    .replace(IMAGE_RE, ' ')
    .replace(LINK_RE, '$1')
    .replace(HTML_RE, ' ')
    .replace(HEADING_RE, '')
    .replace(QUOTE_RE, '')
    .replace(LIST_RE, '')
    .replace(EMPHASIS_RE, '$2')
    .replace(/\[\^[^\]]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 自动摘要：去掉 Markdown/HTML 标记、代码块、图片、链接语法，
 * 合并空白后按 Unicode 字符（Array.from）截取 200 字。
 */
export function extractDescription(source: string, max = 200, format: ContentFormat = 'md'): string {
  const text = stripMarkdown(format === 'mdx' ? stripMdx(source) : source);
  const characters = Array.from(text);
  if (characters.length <= max) return text;
  return `${characters.slice(0, max).join('')}…`;
}

/**
 * 自动摘要；`diaryLabel` 用于「日记」类内容的提示文案（来自站点配置）。
 */
export function getDescription(entry: AnyEntry, diaryLabel = '日记'): string {
  const manual = entry.data.description?.trim();
  if (manual) return manual;

  if (entry.data.password) {
    return entry.collection === 'daily' ? t('description.lockedDaily', { diary: diaryLabel }) : t('description.lockedPost');
  }

  const extracted = extractDescription(entry.body, 200, entry.format ?? contentFormat(entry.filePath));
  if (extracted) return extracted;
  return entry.collection === 'daily' ? t('description.emptyDaily', { diary: diaryLabel }) : t('description.emptyPost');
}

/** 中文按 400 字/分钟估算，代码块与列表不计数，最少 1 分钟。 */
export function estimateReadingTime(source: string, format: ContentFormat = 'md'): number {
  const text = stripMarkdown(format === 'mdx' ? stripMdx(source) : source);
  const length = Array.from(text.replace(/\s/g, '')).length;
  return Math.max(1, Math.ceil(length / 400));
}
