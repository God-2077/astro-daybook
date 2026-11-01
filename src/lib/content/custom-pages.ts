import { existsSync } from 'node:fs';
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { ProjectError } from '../errors';

const PAGES_DIR = path.resolve(process.cwd(), 'src/pages');
const PAGE_EXT_RE = /\.(md|mdx)$/i;

export interface CustomPage {
  filePath: string;
  route: string;
  data: Record<string, unknown>;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.isFile() && isCustomPageFile(entry.name)) files.push(full);
  }
  return files;
}

export function isCustomPageFile(filePath: string): boolean {
  return PAGE_EXT_RE.test(filePath);
}

export function customPageRoute(filePath: string): string {
  const relative = path.relative(PAGES_DIR, filePath).replace(/\\/g, '/').replace(PAGE_EXT_RE, '');
  if (relative === 'index' || relative.endsWith('/index')) {
    const parent = relative.slice(0, -'/index'.length);
    return parent ? `/${parent}` : '/';
  }
  return `/${relative}`;
}

function parseFrontmatter(source: string): Record<string, unknown> {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) return {};
  const parsed = parse(match[1] ?? '', { schema: 'failsafe' });
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
}

export async function getCustomPages(): Promise<CustomPage[]> {
  if (!existsSync(PAGES_DIR)) return [];
  const files = await walk(PAGES_DIR);
  return Promise.all(
    files.map(async (filePath) => {
      const source = await readFile(filePath, 'utf8');
      return { filePath, route: customPageRoute(filePath), data: parseFrontmatter(source) };
    }),
  );
}

export async function validateCustomPages(): Promise<void> {
  const pages = await getCustomPages();
  for (const page of pages) {
    const relative = path.relative(process.cwd(), page.filePath);
    const layout = page.data.layout;
    if (typeof layout !== 'string' || !layout.trim()) {
      throw new ProjectError('自定义页面必须在 frontmatter 中声明 layout（如 ../layouts/PageLayout.astro）', relative);
    }
    const layoutPath = path.resolve(path.dirname(page.filePath), layout);
    if (!existsSync(layoutPath)) {
      throw new ProjectError(`frontmatter.layout 指向的文件不存在：${layout}`, relative);
    }
    if (path.basename(layoutPath) !== 'PageLayout.astro') {
      throw new ProjectError('自定义页面必须使用 src/layouts/PageLayout.astro（或同名布局）', relative);
    }
  }
}

export async function removeDraftCustomPages(dir: URL): Promise<void> {
  const pages = await getCustomPages();
  for (const page of pages) {
    if (page.data.draft !== true) continue;
    if (page.route === '/') continue;
    const output = new URL(`.${page.route}/index.html`, dir);
    await rm(fileURLToPath(output), { force: true });
  }
}
