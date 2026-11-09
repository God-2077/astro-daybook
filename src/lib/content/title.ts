import { siteConfig } from '../../config/site';
import { t } from '../../i18n/current';
import type { AnyEntry } from '../../types/content';
import { formatDisplayDate } from './date';

interface TitleOptions {
  /** 无标题日记的回退值：默认用日期，归档列表用 slug。 */
  dailyFallback?: 'date' | 'slug';
}

/**
 * 内容标题回退：日记允许不写标题，默认用站点时区下的日期作为机器可读标题，
 * 归档列表可改用 slug。
 * 文章 schema 仍要求非空标题，这里的兜底只防御异常数据。
 */
export function getEntryTitle(entry: AnyEntry, options: TitleOptions = {}): string {
  const title = entry.data.title.trim();
  if (title) return title;
  if (entry.collection !== 'daily') return t('common.untitled');
  return options.dailyFallback === 'slug' ? entry.slug : formatDisplayDate(entry.data.date, siteConfig.timezone);
}
