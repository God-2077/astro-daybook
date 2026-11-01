/**
 * 站点支持的语言。构建时只能选一种，不做运行时切换。
 */
export const SITE_LANGS = ['en', 'ja', 'zh_CN', 'zh_TW'] as const;

export type SiteLang = (typeof SITE_LANGS)[number];

export const DEFAULT_SITE_LANG: SiteLang = 'zh_CN';

export function isSiteLang(value: string): value is SiteLang {
  return (SITE_LANGS as readonly string[]).includes(value);
}
