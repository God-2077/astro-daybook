import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const FRONTMATTER_RE = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export interface RawFrontmatter {
  data: Record<string, unknown>;
  body: string;
}

/**
 * 读取 Markdown 的原始 frontmatter。
 *
 * 使用 `schema: 'failsafe'` 保留 YAML 1.2 的字符串语义：无时区的
 * `2023-01-01 10:00:00` 不会被 YAML 自动转成 Date，因此可以按站点时区解析。
 */
export async function readRawFrontmatter(filePath: string, bodyFallback = ''): Promise<RawFrontmatter> {
  let source: string;
  try {
    source = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`无法读取内容文件 ${filePath}: ${(error as Error).message}`);
  }

  const match = FRONTMATTER_RE.exec(source);
  if (!match) {
    return { data: {}, body: bodyFallback || source };
  }

  let data: Record<string, unknown>;
  try {
    const parsed = parse(match[1] ?? '', { schema: 'failsafe' });
    data = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    throw new Error(`无法解析 ${filePath} 的 frontmatter: ${(error as Error).message}`);
  }

  const body = source.slice(match[0].length);
  return { data, body: bodyFallback || body };
}
