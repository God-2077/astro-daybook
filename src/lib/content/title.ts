import { siteConfig } from '../../config/site';
import { t } from '../../i18n/current';
import type { AnyEntry } from '../../types/content';
import { formatDisplayDate } from './date';

/**
 * 内容标题回退：日记允许不写标题，此时用站点时区下的日期作为机器可读标题。
 * 文章 schema 仍要求非空标题，这里的兜底只防御异常数据。
 */
export function getEntryTitle(entry: AnyEntry): string {
  const title = entry.data.title.trim();
  if (title) return title;
  return entry.collection === 'daily' ? formatDisplayDate(entry.data.date, siteConfig.timezone) : t('common.untitled');
}
