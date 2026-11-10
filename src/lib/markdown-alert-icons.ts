import type { PhrasingContent } from 'mdast';

export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

/** 与 src/assets/sprite.html 中的 symbol 一一对应。 */
const ICON_HREFS: Record<AlertType, string> = {
  note: '#i-info',
  tip: '#i-bulb',
  important: '#i-important',
  warning: '#i-warning',
  caution: '#i-caution',
};

/** 标题前的 GitHub 语义图标，由 mdast 转成内联 svg + use。 */
export function alertIcon(type: AlertType): PhrasingContent {
  const use: PhrasingContent = {
    type: 'emphasis',
    data: {
      hName: 'use',
      hProperties: { href: ICON_HREFS[type] },
    },
    children: [],
  };

  return {
    type: 'emphasis',
    data: {
      hName: 'svg',
      hProperties: {
        className: ['a-md-alert-icon', 'a-ico'],
        ariaHidden: 'true',
        focusable: 'false',
      },
    },
    children: [use],
  };
}
