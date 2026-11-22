import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isContentRepoEnabled, resolveContentRoot } from '../src/lib/content/paths';

const root = process.cwd();
const DISABLED_VALUES = new Set(['', '0', 'false', 'off', 'no']);
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
const USAGE = '用法：node --import tsx scripts/content-install.ts [--content-repo <目录>] [--quiet]';

export interface ResolveContentRepoOptions {
  explicitDir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface BuildInstallArgsOptions {
  frozenLockfile?: boolean;
}

export interface PnpmInvocation {
  command: string;
  args: string[];
}

interface CliOptions {
  contentRepo?: string;
  quiet: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 解析要安装依赖的内容仓库目录。
 *
 * 优先级：显式 --content-repo > CONTENT_REPO > CONTENT_REPO_DIR > content。
 * CONTENT_REPO 为停用值时表示主题模式，返回 null；显式目录不允许是停用值。
 */
export function resolveContentRepoDir(options: ResolveContentRepoOptions = {}): string | null {
  const env = options.env ?? process.env;
  const explicit = options.explicitDir;
  let raw: string;

  if (explicit !== undefined) {
    if (DISABLED_VALUES.has(explicit.trim().toLowerCase())) {
      throw new Error('--content-repo 不能是空值或停用值（0/false/off/no）。');
    }
    raw = explicit;
  } else if (env.CONTENT_REPO !== undefined) {
    if (!isContentRepoEnabled(env.CONTENT_REPO)) return null;
    raw = env.CONTENT_REPO;
  } else {
    raw = (env.CONTENT_REPO_DIR ?? '').trim() || 'content';
  }

  return resolveContentRoot(process.cwd(), raw);
}

/**
 * 读取内容仓库 package.json 里声明的依赖名。
 *
 * 文件不存在时返回空数组；JSON 损坏或依赖字段类型错误时抛出带路径的错误。
 */
export function readContentDependencies(contentRoot: string): string[] {
  const packageFile = path.join(contentRoot, 'package.json');
  if (!existsSync(packageFile)) return [];

  let source: string;
  try {
    source = readFileSync(packageFile, 'utf8');
  } catch (error) {
    throw new Error(`读取内容仓库 package.json 失败：${packageFile}：${errorMessage(error)}`);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(source);
  } catch {
    throw new Error(`内容仓库 package.json 不是有效 JSON：${packageFile}`);
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`内容仓库 package.json 必须是对象：${packageFile}`);
  }

  const record = manifest as Record<string, unknown>;
  const dependencies = new Set<string>();
  for (const field of DEPENDENCY_FIELDS) {
    const value = record[field];
    if (value === undefined) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`内容仓库 package.json 的 ${field} 必须是对象：${packageFile}`);
    }
    for (const name of Object.keys(value)) dependencies.add(name);
  }

  return [...dependencies].sort();
}

/** 构造 pnpm 安装参数；--dir 放在 install 前，兼容不同 pnpm 版本的解析。 */
export function buildInstallArgs(contentRoot: string, options: BuildInstallArgsOptions = {}): string[] {
  const args = ['--dir', contentRoot, 'install', '--ignore-workspace', '--prefer-offline'];
  if (options.frozenLockfile) args.push('--frozen-lockfile');
  return args;
}

/**
 * 定位 pnpm。
 *
 * pnpm 脚本会设置 npm_execpath；.js/.cjs/.mjs 需要用当前 Node 执行。
 * Windows 下没有 npm_execpath 时无法可靠地 direct spawn pnpm.cmd，返回 null 让 CLI 给出提示。
 */
export function resolvePnpmInvocation(env: NodeJS.ProcessEnv = process.env): PnpmInvocation | null {
  const execPath = (env.npm_execpath ?? '').trim();
  if (execPath) {
    const extension = path.extname(execPath).toLowerCase();
    if (extension === '.js' || extension === '.cjs' || extension === '.mjs') {
      return { command: process.execPath, args: [execPath] };
    }
    if (process.platform === 'win32' && (extension === '.cmd' || extension === '.bat' || extension === '')) {
      return null;
    }
    return { command: execPath, args: [] };
  }

  if (process.platform === 'win32') return null;
  return { command: 'pnpm', args: [] };
}

function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = (env.CI ?? '').trim().toLowerCase();
  return value !== '' && value !== '0' && value !== 'false';
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { quiet: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === '--quiet') {
      options.quiet = true;
      continue;
    }
    if (arg === '--content-repo') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`--content-repo 需要一个目录。\n${USAGE}`);
      }
      options.contentRepo = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--content-repo=')) {
      const value = arg.slice('--content-repo='.length);
      if (!value) {
        throw new Error(`--content-repo 需要一个目录。\n${USAGE}`);
      }
      options.contentRepo = value;
      continue;
    }
    throw new Error(`未知参数：${arg}。\n${USAGE}`);
  }
  return options;
}

function loadDotEnv(): void {
  const envFile = path.join(root, '.env');
  if (!existsSync(envFile)) return;
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    throw new Error(`读取 .env 失败：${errorMessage(error)}`);
  }
}

function displayPath(target: string): string {
  const relative = path.relative(root, target);
  return relative && !relative.startsWith('..') ? relative : target;
}

function manualInstallCommand(contentRoot: string): string {
  return `pnpm --dir "${contentRoot}" install --ignore-workspace`;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  loadDotEnv();

  const contentRoot = resolveContentRepoDir({ explicitDir: options.contentRepo });
  if (!contentRoot) {
    if (!options.quiet) console.log('[daybook:content] 当前是主题模式，跳过内容仓库依赖安装。');
    return;
  }

  if (!existsSync(contentRoot) || !statSync(contentRoot).isDirectory()) {
    if (options.quiet) return;
    throw new Error(`内容仓库目录不存在：${contentRoot}；请检查 CONTENT_REPO/CONTENT_REPO_DIR，或先运行 pnpm content:clone。`);
  }

  const dependencies = readContentDependencies(contentRoot);
  if (dependencies.length === 0) {
    if (!options.quiet) {
      console.log(`[daybook:content] 内容仓库没有声明依赖，跳过：${displayPath(contentRoot)}`);
    }
    return;
  }

  const ci = isCiEnvironment();
  const lockFile = path.join(contentRoot, 'pnpm-lock.yaml');
  const hasLock = existsSync(lockFile);
  if (ci && !hasLock) {
    throw new Error(
      `CI 环境检测到内容仓库依赖，但缺少 pnpm-lock.yaml：${lockFile}；请先本地运行 pnpm content:install 并提交 lockfile。`,
    );
  }

  const pnpm = resolvePnpmInvocation();
  if (!pnpm) {
    throw new Error(
      `无法定位 pnpm；请在 pnpm 脚本中运行（pnpm content:install），或把 pnpm 加入 PATH。手动命令：${manualInstallCommand(contentRoot)}`,
    );
  }

  console.log(`[daybook:content] 正在安装内容仓库依赖（${displayPath(contentRoot)}）：${dependencies.join('、')}`);
  const args = [...pnpm.args, ...buildInstallArgs(contentRoot, { frozenLockfile: ci && hasLock })];
  const result = spawnSync(pnpm.command, args, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`无法执行 pnpm：${result.error.message}；请手动运行：${manualInstallCommand(contentRoot)}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `pnpm install 失败（退出码 ${result.status ?? 'unknown'}）；请手动运行：${manualInstallCommand(contentRoot)}`,
    );
  }

  console.log('[daybook:content] 内容仓库依赖已就绪。');
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const invoked = path.resolve(entry);
  const self = path.resolve(fileURLToPath(import.meta.url));
  return process.platform === 'win32' ? invoked.toLowerCase() === self.toLowerCase() : invoked === self;
}

if (isDirectRun()) {
  try {
    main();
  } catch (error) {
    console.error(`[daybook:content] ${errorMessage(error)}`);
    process.exit(1);
  }
}
