export type FormatParams = Record<string, string | number>;

/**
 * 替换模板里的 `{name}` 占位符；找不到的参数原样保留，
 * 供客户端继续填充（例如搜索结果计数模板）。
 */
export function format(template: string, params: FormatParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in params ? String(params[key]) : match;
  });
}
