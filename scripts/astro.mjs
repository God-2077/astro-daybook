import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nodeModulesAstro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');

function fail(message) {
  console.error(`[daybook] ${message}`);
  process.exit(1);
}

function loadDotEnv() {
  const envFile = path.join(root, '.env');
  if (!existsSync(envFile)) return;
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    fail(`读取 .env 失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

const CONTENT_CACHE_FILES = ['data-store.json', 'content-modules.mjs', 'content-assets.mjs'];
const contentModeFile = path.join(root, '.astro', 'daybook-content-mode');

/**
 * Astro 的 content layer 在 dev / check 下始终读写 .astro/，cacheDir 只隔离 build。
 * 主题与内容仓库的集合基址不同，切换来源时若沿用旧 data-store，会把两边的条目
 * 混在一起（典型症状是 specCollection about 重复 slug）。这里记录上次来源，
 * 变化时清掉内容层缓存，让 Astro 重新扫描当前来源。
 */
function resetContentCacheForMode(env) {
  const contentRepo = env.CONTENT_REPO?.trim();
  const modeKey = contentRepo ? `content:${path.resolve(root, contentRepo)}` : 'theme';
  let previous = '';
  try {
    previous = readFileSync(contentModeFile, 'utf8').trim();
  } catch {
    // 首次运行没有标记文件。
  }
  if (previous === modeKey) return;

  for (const name of CONTENT_CACHE_FILES) {
    try {
      rmSync(path.join(root, '.astro', name), { force: true });
    } catch (error) {
      console.error(`[daybook] 清理 Astro 内容缓存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  try {
    mkdirSync(path.dirname(contentModeFile), { recursive: true });
    writeFileSync(contentModeFile, `${modeKey}\n`);
  } catch (error) {
    console.error(`[daybook] 写入内容来源标记失败：${error instanceof Error ? error.message : String(error)}`);
  }
  if (previous) {
    console.error('[daybook] 内容来源已切换，已清理 Astro 内容缓存');
  }
}

loadDotEnv();

const argv = process.argv.slice(2);
const command = argv.shift();
if (!command || command.startsWith('-')) {
  fail('用法：node scripts/astro.mjs <dev|build|preview|check> [--content | --content-repo=<目录> | --theme]');
}
if (!existsSync(nodeModulesAstro)) {
  fail(`找不到 Astro：${nodeModulesAstro}，请先运行 pnpm install`);
}

let contentMode = false;
let contentDir;
let parseFlags = true;
const forwarded = [];

for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (parseFlags && arg === '--') {
    parseFlags = false;
    continue;
  }
  if (!parseFlags) {
    forwarded.push(arg);
    continue;
  }
  if (arg === '--content') {
    contentMode = true;
    continue;
  }
  if (arg === '--theme' || arg === '--no-content') {
    contentMode = false;
    contentDir = undefined;
    continue;
  }
  if (arg.startsWith('--content=')) {
    contentMode = true;
    contentDir = arg.slice('--content='.length);
    continue;
  }
  if (arg === '--content-repo') {
    const value = argv[index + 1];
    if (!value || value.startsWith('-')) fail('--content-repo 需要一个目录');
    contentDir = value;
    contentMode = true;
    index += 1;
    continue;
  }
  if (arg.startsWith('--content-repo=')) {
    contentDir = arg.slice('--content-repo='.length);
    if (!contentDir) fail('--content-repo 需要一个目录');
    contentMode = true;
    continue;
  }
  forwarded.push(arg);
}

const env = { ...process.env };
if (contentMode) {
  const repoDir = contentDir || process.env.CONTENT_REPO_DIR || 'content';
  env.CONTENT_REPO = repoDir;
  console.error(`[daybook] 内容仓库模式：${repoDir}`);
} else if (contentDir === undefined) {
  // 显式 --theme / --no-content 时清除环境里的内容仓库设置。
  // 没有给任何模式参数时保留调用方环境，方便 CONTENT_REPO=... 直接调试。
  const hasThemeFlag = argv.includes('--theme') || argv.includes('--no-content');
  if (hasThemeFlag) delete env.CONTENT_REPO;
}

resetContentCacheForMode(env);

const child = spawn(process.execPath, [nodeModulesAstro, command, ...forwarded], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: true,
});

child.on('error', (error) => {
  fail(`启动 Astro 失败：${error.message}`);
});
child.on('exit', (code) => {
  process.exit(code ?? 1);
});
