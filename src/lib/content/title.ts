import { siteConfig } from '../../config/site';
import { t } from '../../i18n/current';
import type { DailyTitleFallbackPosition } from '../../types/config';
import type { AnyEntry } from '../../types/content';
import { formatDisplayDate } from './date';

interface DailyTitleFallbackValues extends Record<string, string> {
  date: string;
  slug: string;
  diary: string;
  untitled: string;
}

/**
 * 用日记上下文替换自定义回退模板中的占位符。
 *
 * 占位符白名单由配置层校验；这里对未知占位符保持原样，避免渲染阶段抛错。
 */
export function renderDailyTitleFallback(template: string, values: DailyTitleFallbackValues): string {
  return template.replace(/\{([^{}]*)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? (values[name] as string) : match,
  );
}

/**
 * 内容标题回退：日记允许不写标题，按 `siteConfig.dailyTitleFallback[position]`
 * 选择日期、slug、内置「未命名」文案或自定义模板。
 * 文章 schema 仍要求非空标题，这里的兜底只防御异常数据。
 */
export function getEntryTitle(entry: AnyEntry, position: DailyTitleFallbackPosition): string {
  const title = entry.data.title.trim();
  if (title) return title;
  if (entry.collection !== 'daily') return t('common.untitled');

  const fallback = siteConfig.dailyTitleFallback[position];
  if (fallback === 'date') return formatDisplayDate(entry.data.date, siteConfig.timezone);
  if (fallback === 'slug') return entry.slug;
  if (fallback === 'untitled') return t('common.untitled');

  const values: DailyTitleFallbackValues = {
    date: formatDisplayDate(entry.data.date, siteConfig.timezone),
    slug: entry.slug,
    diary: siteConfig.labels.diary,
    untitled: t('common.untitled'),
  };
  return renderDailyTitleFallback(fallback.template, values);
}
