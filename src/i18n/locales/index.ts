import type { SiteLang } from '../languages';
import type { LocalePackage } from '../locale-types';
import en from './en';
import ja from './ja';
import zhCN from './zh-CN';
import zhTW from './zh-TW';

export const localePackages: Record<SiteLang, LocalePackage> = {
  en,
  ja,
  zh_CN: zhCN,
  zh_TW: zhTW,
};
