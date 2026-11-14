/**
 * 生成 Markdown 指令 HTML 时的最小转义工具。
 *
 * 只转义五个 HTML 敏感字符，属性值与文本节点都走同一套规则；
 * 不负责 URL/协议校验，调用方仍需先做白名单。
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
