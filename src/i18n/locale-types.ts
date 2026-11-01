import type { SiteLang } from './languages';
import type { MessageKey } from './locales/zh-CN';

export type { MessageKey };

export type CountKind = 'entries' | 'posts' | 'pinned' | 'tags' | 'categories' | 'friends';

export interface CountForms {
  one: string;
  other: string;
}

export interface LocaleMeta {
  readonly lang: SiteLang;
  readonly htmlLang: string;
  readonly ogLocale: string;
  readonly twikooLang: string;
  /** Waline 界面语言；日文需映射为 `jp`。 */
  readonly walineLang: string;
  /** Artalk 界面语言。 */
  readonly artalkLang: string;
  readonly weekdays: readonly string[];
  readonly months: readonly string[];
  readonly datePatterns: {
    readonly display: string;
    readonly dateTime: string;
    readonly monthDay: string;
    readonly month: string;
  };
  readonly monthLabel: (year: number, monthName: string) => string;
  readonly monthTitle: (year: number, month: number, monthName: string) => string;
}

export interface LocalePackage {
  meta: LocaleMeta;
  messages: Record<MessageKey, string>;
  counts: Record<CountKind, CountForms>;
}

/** 正文图片放大层（lightGallery）的按钮与朗读文案。 */
export interface LightboxMessages {
  close: string;
  prev: string;
  next: string;
  actualSize: string;
  thumbnails: string;
  autoplay: string;
  fullscreen: string;
  download: string;
  label: string;
  more: string;
  slideCounter: string;
}

/** 注入给 `src/scripts/client.ts` 的最小文案集，不含任何配置对象。 */
export interface ClientMessages {
  themeToLight: string;
  themeToDark: string;
  loading: string;
  slow: string;
  loaded: string;
  imageFailed: string;
  expand: string;
  collapse: string;
  heatLabelOne: string;
  heatLabelOther: string;
  months: string[];
  lightbox: LightboxMessages;
}

/** 传给 SearchPanel 的文案与标签，全部是已翻译字符串。 */
export interface SearchMessages {
  tabAll: string;
  tabDaily: string;
  tabPost: string;
  tabPage: string;
  kindDaily: string;
  kindPost: string;
  kindPage: string;
  rootAria: string;
  label: string;
  placeholder: string;
  clearAria: string;
  closeAria: string;
  cancel: string;
  scopesAria: string;
  loading: string;
  countOne: string;
  countOther: string;
  errorKicker: string;
  error: string;
  idle: string;
  hint: string;
  empty: string;
  counts: string;
  viewAllOne: string;
  viewAllOther: string;
  untitled: string;
}

/** 传给 LockedContent 的文案；标题与提示里的 noun 已在服务端拼好。 */
export interface LockedMessages {
  title: string;
  note: string;
  password: string;
  placeholder: string;
  unlock: string;
  error: string;
  hint: string;
  unlocked: string;
  comments: string;
}
