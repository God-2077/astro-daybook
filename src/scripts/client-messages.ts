import type { ClientMessages } from '../i18n/locale-types';

/**
 * 读取 `BaseLayout` 注入的客户端文案。
 *
 * 单独成模块，是因为 `gallery.ts` 由 `client.ts` 动态导入：两边都需要这份文案，
 * 但反向静态导入 `client.ts` 会形成循环。
 */
declare global {
  interface Window {
    __DAYBOOK_I18N__?: ClientMessages;
  }
}

export function readClientMessages(): ClientMessages {
  const value = window.__DAYBOOK_I18N__;
  if (!value) throw new Error('[daybook:i18n] missing client messages');
  return value;
}
