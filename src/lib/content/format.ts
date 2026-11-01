import type { ContentFormat } from '../../types/content';

/** 内容源文件扩展名 → 渲染格式。 */
export function contentFormat(filePath: string): ContentFormat {
  return /\.mdx$/i.test(filePath) ? 'mdx' : 'md';
}

/**
 * 从 MDX 源码里剥掉 ESM 与 JSX 表达式，留下可供摘要/阅读时长估算的正文。
 *
 * 只做「近似」处理：真正的渲染交给 Astro 的 MDX 编译器；这里的目标是避免
 * `import`、`export const`、`{expression}` 混进 description 或阅读字数。
 */
export function stripMdx(source: string): string {
  const lines = source.split('\n');
  const kept: string[] = [];
  let skipDepth = 0;

  for (const line of lines) {
    if (skipDepth > 0) {
      skipDepth += braceDelta(line);
      if (skipDepth <= 0) skipDepth = 0;
      continue;
    }

    if (/^\s*(?:import|export)\b/.test(line)) {
      const depth = braceDelta(line);
      if (depth > 0) skipDepth = depth;
      continue;
    }

    kept.push(line);
  }

  return kept
    .join('\n')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ');
}

function braceDelta(line: string): number {
  let depth = 0;
  for (const char of line) {
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
  }
  return depth;
}
