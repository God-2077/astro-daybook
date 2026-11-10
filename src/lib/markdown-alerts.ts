import type { Blockquote, Paragraph, Root } from 'mdast';
import { visit } from 'unist-util-visit';

import type { SiteLang } from '../i18n/languages';
import type { MessageKey } from '../i18n/locale-types';
import { translate } from '../i18n/translate';
import { type AlertType, alertIcon } from './markdown-alert-icons';

/**
 * GitHub 风格的 blockquote alert。
 *
 * 只处理第一段开头的 [!NOTE] 标记；需要自定义标题时使用
 * remark-directive 的容器写法 :::note[标题]。
 */

const ALERT_TYPES = new Set<AlertType>(['note', 'tip', 'important', 'warning', 'caution']);

const TITLE_KEYS: Record<AlertType, MessageKey> = {
  note: 'markdown.alertNote',
  tip: 'markdown.alertTip',
  important: 'markdown.alertImportant',
  warning: 'markdown.alertWarning',
  caution: 'markdown.alertCaution',
};

const ALERT_MARKER = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*)$/;

interface AlertData {
  hName?: string;
  hProperties?: {
    className?: string | string[];
  };
}

function hasAlertClass(node: Blockquote): boolean {
  const className = (node.data as AlertData | undefined)?.hProperties?.className;
  if (Array.isArray(className)) return className.includes('a-md-alert');
  return typeof className === 'string' && className.split(/\s+/).includes('a-md-alert');
}

function removeLeadingBreaks(paragraph: Paragraph): void {
  while (paragraph.children.length > 0) {
    const child = paragraph.children[0];
    if (child.type === 'break') {
      paragraph.children.shift();
      continue;
    }
    if (child.type === 'text') {
      const value = child.value.replace(/^\s+/, '');
      if (value.length === 0) {
        paragraph.children.shift();
        continue;
      }
      child.value = value;
    }
    break;
  }
}

function prependTitle(node: Blockquote, type: AlertType, lang: SiteLang): void {
  const title: Paragraph = {
    type: 'paragraph',
    data: {
      hName: 'p',
      hProperties: { className: ['a-md-alert-title'] },
    },
    children: [alertIcon(type), { type: 'text', value: translate(lang, TITLE_KEYS[type]) }],
  };
  node.children.unshift(title);
}

function decorate(node: Blockquote, type: AlertType, lang: SiteLang): void {
  const existing = (node.data as AlertData | undefined)?.hProperties?.className;
  const classList = Array.isArray(existing)
    ? existing.map(String)
    : typeof existing === 'string'
      ? existing.split(/\s+/).filter(Boolean)
      : [];
  const className = [...new Set([...classList, 'a-md-alert', 'a-md-alert--' + type])];

  node.data = {
    ...(node.data ?? {}),
    hName: 'blockquote',
    hProperties: {
      ...(node.data as AlertData | undefined)?.hProperties,
      className,
    },
  };
  prependTitle(node, type, lang);
}

export function remarkAlerts(lang: SiteLang) {
  return (tree: Root): void => {
    visit(tree, 'blockquote', (node) => {
      if (hasAlertClass(node)) return;

      const first = node.children[0];
      if (first?.type !== 'paragraph') return;
      const firstText = first.children[0];
      if (firstText?.type !== 'text') return;

      const match = firstText.value.match(ALERT_MARKER);
      if (!match) return;

      const type = match[1].toLowerCase() as AlertType;
      if (!ALERT_TYPES.has(type)) return;

      const rest = match[2].replace(/^\s+/, '');
      if (rest.length > 0) {
        firstText.value = rest;
      } else {
        first.children.shift();
      }
      removeLeadingBreaks(first);
      if (first.children.length === 0) node.children.shift();

      decorate(node, type, lang);
    });
  };
}
