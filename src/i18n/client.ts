import type { SiteLang } from './languages';
import type { ClientMessages } from './locale-types';
import { localePackages } from './locales';
import { translate } from './translate';

/**
 * 生成注入给客户端脚本的最小文案集。
 * 只包含当前语言的字符串，不含 `siteConfig`，避免把配置与 Zod 打进客户端包。
 */
export function getClientMessages(lang: SiteLang): ClientMessages {
  return {
    themeToLight: translate(lang, 'theme.toggleLight'),
    themeToDark: translate(lang, 'theme.toggleDark'),
    loading: translate(lang, 'client.loading'),
    slow: translate(lang, 'client.slow'),
    loaded: translate(lang, 'client.loaded'),
    imageFailed: translate(lang, 'client.imageFailed'),
    expand: translate(lang, 'common.expand'),
    collapse: translate(lang, 'common.collapse'),
    heatLabelOne: translate(lang, 'client.heatLabelOne'),
    heatLabelOther: translate(lang, 'client.heatLabelOther'),
    months: [...localePackages[lang].meta.months],
    lightbox: {
      close: translate(lang, 'client.lightboxClose'),
      prev: translate(lang, 'client.lightboxPrev'),
      next: translate(lang, 'client.lightboxNext'),
      actualSize: translate(lang, 'client.lightboxActualSize'),
      thumbnails: translate(lang, 'client.lightboxThumbnails'),
      autoplay: translate(lang, 'client.lightboxAutoplay'),
      fullscreen: translate(lang, 'client.lightboxFullscreen'),
      download: translate(lang, 'client.lightboxDownload'),
      label: translate(lang, 'client.lightboxLabel'),
      more: translate(lang, 'client.lightboxMore'),
      slideCounter: translate(lang, 'client.lightboxSlideCounter'),
    },
  };
}
