/**
 * Twikoo 2.x 的语言分片映射。
 *
 * Twikoo 会把 `lang` 转成小写后查表，`zh-CN` 与 `en` 直接内置在主包里，
 * 其余语言从 `${localeBaseUrl}/locales/<locale>.js` 动态加载。
 * 映射与 twikoo@2.0.17 的主包保持一致，升级 Twikoo 时请复核。
 */
const TWIKOO_LOCALE_IDS: Record<string, string> = {
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hk': 'zh-HK',
  'zh-tw': 'zh-TW',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  uz: 'uz-UZ',
  'uz-uz': 'uz-UZ',
  ja: 'ja-JP',
  'ja-jp': 'ja-JP',
  ko: 'ko-KR',
  'ko-kr': 'ko-KR',
  vi: 'vi-VN',
  'vi-vn': 'vi-VN',
  id: 'id-ID',
  'id-id': 'id-ID',
};

const BUILT_IN_LOCALES = new Set(['zh-CN', 'en']);

/** 语言分片在构建产物与 dev 中间件中的相对基址。 */
export const TWIKOO_LOCALE_BASE = 'js/twikoo';

/**
 * 返回指定 Twikoo 语言需要的分片文件名。
 *
 * - 内置语言（`zh-CN` / `en`）返回 `null`，不会输出文件；
 * - 未知语言返回 `null`，由 Twikoo 自己回退到浏览器语言或英文。
 */
export function twikooLocaleFile(lang: string | undefined): string | null {
  const locale = TWIKOO_LOCALE_IDS[lang?.trim().toLowerCase() ?? ''];
  if (!locale || BUILT_IN_LOCALES.has(locale)) return null;
  return `${locale}.js`;
}
