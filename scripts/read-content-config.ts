import { pathToFileURL } from 'node:url';
import { CONTENT_CONFIG_MARKER } from './content-config-protocol';

interface ConfigModule {
  default?: unknown;
  siteConfig?: unknown;
  linksConfig?: unknown;
  [key: string]: unknown;
}

async function loadConfig(file: string, exportName: 'siteConfig' | 'linksConfig'): Promise<unknown> {
  const module = (await import(pathToFileURL(file).href)) as ConfigModule;
  const value = module.default ?? module[exportName];
  if (value === undefined || value === null) {
    throw new Error(`${file} 必须默认导出配置对象，或导出名为 ${exportName} 的对象`);
  }
  return value;
}

async function main(): Promise<void> {
  const [siteFile, linksFile] = process.argv.slice(2);
  if (!siteFile || !linksFile) {
    throw new Error('用法：tsx scripts/read-content-config.ts <site.ts> <links.ts>');
  }

  const [site, links] = await Promise.all([loadConfig(siteFile, 'siteConfig'), loadConfig(linksFile, 'linksConfig')]);

  process.stdout.write(`${CONTENT_CONFIG_MARKER}${JSON.stringify({ site, links })}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[daybook:content] 读取内容仓库配置失败：${message}`);
  process.exitCode = 1;
});
