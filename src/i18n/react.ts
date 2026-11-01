import type { SiteLang } from './languages';
import type { LockedMessages, SearchMessages } from './locale-types';
import { translate } from './translate';

export function getSearchMessages(lang: SiteLang, diaryLabel: string): SearchMessages {
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate(lang, key, params);

  return {
    tabAll: t('search.tabAll'),
    tabDaily: diaryLabel,
    tabPost: t('search.tabPost'),
    tabPage: t('search.tabPage'),
    kindDaily: diaryLabel,
    kindPost: t('search.kindPost'),
    kindPage: t('search.kindPage'),
    rootAria: t('search.rootAria'),
    label: t('search.label', { diary: diaryLabel }),
    placeholder: t('search.placeholder', { diary: diaryLabel }),
    clearAria: t('search.clearAria'),
    closeAria: t('search.closeAria'),
    cancel: t('search.cancel'),
    scopesAria: t('search.scopesAria'),
    loading: t('search.loading'),
    countOne: t('search.countOne'),
    countOther: t('search.countOther'),
    errorKicker: t('search.errorKicker'),
    error: t('search.error'),
    idle: t('search.idle', { diary: diaryLabel }),
    hint: t('search.hint'),
    empty: t('search.empty'),
    counts: t('search.counts', { diary: diaryLabel }),
    viewAllOne: t('search.viewAllOne'),
    viewAllOther: t('search.viewAllOther'),
    untitled: t('search.untitled'),
  };
}

export function getLockedMessages(lang: SiteLang, kind: 'daily' | 'post', diaryLabel: string): LockedMessages {
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate(lang, key, params);
  const noun = kind === 'daily' ? diaryLabel : t('content.postLower');

  return {
    title: t('lock.title', { noun }),
    note: t('lock.note', { noun }),
    password: t('lock.password'),
    placeholder: t('lock.placeholder'),
    unlock: t('lock.unlock'),
    error: t('lock.error'),
    hint: t('lock.hint'),
    unlocked: kind === 'daily' ? t('lock.unlockedDaily', { diary: diaryLabel }) : t('lock.unlockedPost'),
    comments: t('lock.comments'),
  };
}
