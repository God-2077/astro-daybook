import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { siteConfig as themeSiteConfig } from '../src/config/site';
import { loadSiteContext } from './site-context';

const root = fileURLToPath(new URL('..', import.meta.url));

function fail(message: string): never {
  console.error(`[daybook] ${message}`);
  process.exit(1);
}

function loadDotEnv(): void {
  const envFile = path.join(root, '.env');
  if (!existsSync(envFile)) return;
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    fail(`读取 .env 失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

interface ModeOptions {
  content: boolean;
  theme: boolean;
  contentDir?: string;
}

function parseModeArgs(argv: string[]): ModeOptions {
  let content = false;
  let theme = false;
  let contentDir: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--content') {
      content = true;
      theme = false;
      continue;
    }
    if (arg === '--theme' || arg === '--no-content') {
      theme = true;
      content = false;
      contentDir = undefined;
      continue;
    }
    if (arg.startsWith('--content=')) {
      const value = arg.slice('--content='.length);
      if (!value) fail('--content 需要一个目录');
      content = true;
      theme = false;
      contentDir = value;
      continue;
    }
    if (arg === '--content-repo') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) fail('--content-repo 需要一个目录');
      content = true;
      theme = false;
      contentDir = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--content-repo=')) {
      const value = arg.slice('--content-repo='.length);
      if (!value) fail('--content-repo 需要一个目录');
      content = true;
      theme = false;
      contentDir = value;
      continue;
    }
    fail(`未知参数：${arg}\n用法：tsx scripts/make-og-image.ts [--content | --content-repo=<目录> | --theme]`);
  }

  return { content, theme, contentDir };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

loadDotEnv();

const options = parseModeArgs(process.argv.slice(2));
if (options.content) {
  process.env.CONTENT_REPO = options.contentDir || process.env.CONTENT_REPO_DIR || 'content';
} else if (options.theme) {
  delete process.env.CONTENT_REPO;
}

const context = await loadSiteContext(root, themeSiteConfig);
const { siteConfig } = context;
const title = escapeXml(siteConfig.title);
const subtitle = escapeXml(siteConfig.subtitle || '日记与文章');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="page" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#EBEDEE" />
      <stop offset="1" stop-color="#FDFBFB" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#page)" />
  <path d="M0 560h1200" stroke="#E7E0E2" stroke-width="2" />
  <g transform="translate(96 430)" fill="none" stroke="#BE4154" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 120c10-42 36-64 76-64s66 22 76 64" />
    <path d="M26 120V44h120v76M26 84h120M86 24v96" />
    <path d="M44 24h84l14 20H30z" />
  </g>
  <path d="M1024 176l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="#ED6EA0" />
  <text x="96" y="214" fill="#2A2426" font-family="Georgia, 'Songti SC', serif" font-size="92" letter-spacing="2">${title}</text>
  <text x="100" y="278" fill="#6A6065" font-family="Georgia, 'Songti SC', serif" font-size="28" letter-spacing="6">${subtitle}</text>
  <text x="1104" y="532" fill="#BE4154" text-anchor="end" font-family="Georgia, serif" font-size="22">${escapeXml(siteConfig.author)} · est. ${siteConfig.since}</text>
</svg>`;

mkdirSync(context.publicDir, { recursive: true });
const output = path.join(context.publicDir, 'og-default.png');
await sharp(Buffer.from(svg)).png().toFile(output);
console.log(`[daybook] ${context.mode === 'content' ? '内容模式' : '主题模式'}：${path.relative(root, output)} written`);
