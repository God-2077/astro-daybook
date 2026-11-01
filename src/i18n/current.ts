import { siteConfig } from '../config/site';
import type { FormatParams } from './format';
import type { CountKind, MessageKey } from './locale-types';
import { localePackages } from './locales';
import { translate, translateCount } from './translate';

/** 当前构建语言，由 `src/config/site.ts` 的 `lang` 决定。 */
export const lang = siteConfig.lang;

export const localeMeta = localePackages[lang].meta;

export function t(key: MessageKey, params?: FormatParams): string {
  return translate(lang, key, params);
}

export function tCount(kind: CountKind, count: number): string {
  return translateCount(lang, kind, count);
}
