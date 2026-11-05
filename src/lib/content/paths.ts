import path from 'node:path';

/**
 * 内容仓库的四个集合。主题内容放在 `src/content/`，内容仓库放在
 * `<CONTENT_REPO>/daily|post|spec|pages`。
 */
export const CONTENT_COLLECTIONS = ['daily', 'post', 'spec', 'pages'] as const;

export type ContentRootCollection = (typeof CONTENT_COLLECTIONS)[number];

const DISABLED_VALUES = new Set(['', '0', 'false', 'off', 'no']);

function normalizedRoot(root: string): string {
  return path.resolve(root);
}

function assertCollection(collection: string): asserts collection is ContentRootCollection {
  if (!CONTENT_COLLECTIONS.includes(collection as ContentRootCollection)) {
    throw new Error(`未知内容集合：${collection}；可选值：${CONTENT_COLLECTIONS.join('、')}`);
  }
}

function toPosix(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * CONTENT_REPO 为空、0、false、off、no 时使用主题内置的 `src/content/`。
 * 显式设置其它值时进入内容仓库模式。
 */
export function isContentRepoEnabled(raw: string | undefined = process.env.CONTENT_REPO): boolean {
  if (raw === undefined) return false;
  return !DISABLED_VALUES.has(raw.trim().toLowerCase());
}

/**
 * 解析内容根目录（绝对路径）。未设置 CONTENT_REPO 时返回 `<root>/src/content`。
 * 内容仓库可以是主题目录内的 `content`，也可以是同一盘符下的 `../my-content`；
 * 不支持跨盘符路径，因为 Astro 的 glob base 必须能表示为相对项目根的路径。
 */
export function resolveContentRoot(root: string = process.cwd(), raw: string | undefined = process.env.CONTENT_REPO): string {
  const base = normalizedRoot(root);
  if (!isContentRepoEnabled(raw)) {
    return path.join(base, 'src', 'content');
  }

  const contentRoot = path.resolve(base, (raw ?? '').trim());
  if (contentRoot === base) {
    throw new Error('内容仓库不能是主题仓库根目录；请把 CONTENT_REPO 指向一个子目录或独立的内容目录。');
  }

  const relative = path.relative(base, contentRoot);
  if (path.isAbsolute(relative)) {
    throw new Error(`内容仓库必须与主题仓库在同一盘符：${contentRoot}`);
  }

  return contentRoot;
}

/**
 * 解析某个集合的绝对目录。
 */
export function resolveCollectionBase(root: string, raw: string | undefined, collection: ContentRootCollection): string {
  assertCollection(collection);
  return path.join(resolveContentRoot(root, raw), collection);
}

/**
 * 当前进程下某个集合相对项目根的 POSIX 路径（无尾斜杠）。
 * 用于错误信息、默认 slug 与读取原始 frontmatter 的路径拼接。
 */
export function contentBase(collection: ContentRootCollection): string {
  const root = process.cwd();
  const absolute = resolveCollectionBase(root, process.env.CONTENT_REPO, collection);
  return toPosix(path.relative(root, absolute)) || '.';
}

/**
 * Astro glob loader 的 base：必须是相对项目根的 POSIX 路径。
 * `src/content/daily` → `./src/content/daily`；`../my-content/daily` 保持原样。
 */
export function contentGlobBase(collection: ContentRootCollection): string {
  const base = contentBase(collection);
  return base.startsWith('.') ? base : `./${base}`;
}

/**
 * 把 Astro 的 `filePath`（相对项目根）转换为相对集合根目录的路径。
 * filePath 在 Windows 上可能带反斜杠；无法匹配时退回文件名，保持旧行为。
 */
export function relativePathForCollection(filePath: string, base: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const marker = `${base.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')}/`;
  const index = normalized.lastIndexOf(marker);
  if (index >= 0) return normalized.slice(index + marker.length);
  return normalized.split('/').pop() ?? normalized;
}
