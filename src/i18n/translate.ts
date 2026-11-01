import { type FormatParams, format } from './format';
import type { SiteLang } from './languages';
import type { CountKind, MessageKey } from './locale-types';
import { localePackages } from './locales';

export function translate(lang: SiteLang, key: MessageKey, params?: FormatParams): string {
  const template = localePackages[lang].messages[key];

  if (template === undefined) {
    throw new Error(`[daybook:i18n] missing key "${key}" for ${lang}`);
  }

  return format(template, params);
}

export function translateCount(lang: SiteLang, kind: CountKind, count: number): string {
  const forms = localePackages[lang].counts[kind];
  const plural = new Intl.PluralRules(localePackages[lang].meta.htmlLang).select(count);

  return format(plural === 'one' ? forms.one : forms.other, { count });
}
