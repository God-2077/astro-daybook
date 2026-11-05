import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { defineLinksConfig, defineSiteConfig } from '../src/config/define';
import { isContentRepoEnabled, resolveContentRoot } from '../src/lib/content/paths';
import type { LinksConfig, LinksConfigInput, SiteConfig, SiteConfigInput } from '../src/types/config';
import { CONTENT_CONFIG_MARKER } from './content-config-protocol';

interface BaseSiteContext {
  /** 当前内容根目录（绝对路径）；主题模式是 src/content，内容模式是 CONTENT_REPO。 */
  contentRoot: string;
  /** 当前生效的站点配置。 */
  siteConfig: SiteConfig;
  /** 站点配置文件绝对路径，供 Vite 监听。 */
  siteConfigFile: string;
  /** 友链配置文件绝对路径，供 Vite 监听。 */
  linksConfigFile: string;
}

export interface ThemeSiteContext extends BaseSiteContext {
  mode: 'theme';
  linksConfig?: undefined;
}

export interface ContentSiteContext extends BaseSiteContext {
  mode: 'content';
  linksConfig: LinksConfig;
}

export type SiteContext = ThemeSiteContext | ContentSiteContext;

interface ContentConfigPayload {
  site: unknown;
  links: unknown;
}

interface ExecResult {
  stdout: string;
  stderr: string;
}

function relativeLabel(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

function assertFile(file: string, label: string): void {
  if (!existsSync(file)) {
    throw new Error(
      `内容仓库缺少 ${label}：${file}\n` +
        '请确认 CONTENT_REPO 指向内容仓库根目录，并按 docs/dual-repo.md 创建 config/site.ts 与 config/links.ts。',
    );
  }
}

function assertRecord(value: unknown, file: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${file} 必须导出一个对象`);
  }
  return value as Record<string, unknown>;
}

function runConfigReader(root: string, siteFile: string, linksFile: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ['--import', 'tsx', path.join(root, 'scripts/read-content-config.ts'), siteFile, linksFile],
      {
        cwd: root,
        env: process.env,
        timeout: 30_000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const details = String(stderr || '').trim() || error.message;
          reject(new Error(`读取内容仓库配置失败：\n${details}`));
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

async function readContentConfig(root: string, siteFile: string, linksFile: string): Promise<ContentConfigPayload> {
  const result = await runConfigReader(root, siteFile, linksFile);
  const markerIndex = result.stdout.lastIndexOf(CONTENT_CONFIG_MARKER);
  if (markerIndex < 0) {
    const details = result.stderr.trim() || result.stdout.trim() || '子进程没有输出配置';
    throw new Error(`读取内容仓库配置失败：\n${details}`);
  }

  const json = result.stdout
    .slice(markerIndex + CONTENT_CONFIG_MARKER.length)
    .split(/\r?\n/, 1)[0]
    .trim();
  try {
    const payload = JSON.parse(json) as Partial<ContentConfigPayload>;
    if (payload.site === undefined || payload.links === undefined) {
      throw new Error('配置对象缺少 site 或 links');
    }
    return { site: payload.site, links: payload.links };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`解析内容仓库配置失败：${message}`);
  }
}

/**
 * 解析本次构建/开发使用的内容与站点配置。
 *
 * - 主题模式：直接使用 astro.config.ts 静态引入的 src/config/site.ts；
 * - 内容模式：从 CONTENT_REPO/config/{site,links}.ts 读取，复用主题的
 *   defineSiteConfig / defineLinksConfig 做 Zod 与语义校验。
 *
 * 内容仓库的 TS 配置由 node --import tsx 子进程读取，避免把内容目录
 * 强绑定到主题的 Vite / TypeScript 配置；子进程只通过私有标记传 JSON。
 */
export async function loadSiteContext(root: string, themeSiteConfig: SiteConfig): Promise<SiteContext> {
  const projectRoot = path.resolve(root);
  const rawContentRepo = process.env.CONTENT_REPO;
  const contentRoot = resolveContentRoot(projectRoot, rawContentRepo);
  const themeSiteFile = path.join(projectRoot, 'src', 'config', 'site.ts');
  const themeLinksFile = path.join(projectRoot, 'src', 'config', 'links.ts');

  if (!isContentRepoEnabled(rawContentRepo)) {
    return {
      mode: 'theme',
      contentRoot,
      siteConfig: themeSiteConfig,
      siteConfigFile: themeSiteFile,
      linksConfigFile: themeLinksFile,
    };
  }

  const siteFile = path.join(contentRoot, 'config', 'site.ts');
  const linksFile = path.join(contentRoot, 'config', 'links.ts');
  assertFile(siteFile, 'config/site.ts');
  assertFile(linksFile, 'config/links.ts');

  const raw = await readContentConfig(projectRoot, siteFile, linksFile);
  const siteLabel = relativeLabel(projectRoot, siteFile);
  const linksLabel = relativeLabel(projectRoot, linksFile);
  const siteConfig = defineSiteConfig(assertRecord(raw.site, siteLabel) as unknown as SiteConfigInput, siteLabel);
  const linksConfig = defineLinksConfig(assertRecord(raw.links, linksLabel) as unknown as LinksConfigInput, linksLabel);

  return {
    mode: 'content',
    contentRoot,
    siteConfig,
    linksConfig,
    siteConfigFile: siteFile,
    linksConfigFile: linksFile,
  };
}
