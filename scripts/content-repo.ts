import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  type ContentRepoEnv,
  gitEnvForRepo,
  isGitRepo,
  isNonEmptyDir,
  readContentRepoEnv,
  redactGitText,
  resolveKeyPath,
  resolveTargetDir,
} from './content-repo-lib';

const root = process.cwd();

function fail(message: string): never {
  console.error(`[daybook:content] ${message}`);
  process.exit(1);
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function loadDotEnv(): void {
  const envFile = path.join(root, '.env');
  if (!existsSync(envFile)) return;
  try {
    process.loadEnvFile(envFile);
  } catch {
    fail('读取 .env 失败，请检查文件格式。');
  }
}

function runGit(args: string[], repo: ContentRepoEnv): string {
  // 脚本不交互：禁用凭据 helper，避免内联 token 被 helper 接管时弹出窗口或挂起。
  const fullArgs = ['-c', 'credential.helper=', ...args];
  const result = spawnSync('git', fullArgs, {
    cwd: root,
    env: gitEnvForRepo(repo, root),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  if (result.error) {
    fail(`无法执行 git：${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = [result.stderr, result.stdout]
      .map((line) => line?.toString().trim() ?? '')
      .filter(Boolean)
      .join('\n')
      .trim();
    const detail = output ? `\n${redactGitText(output, repo.url)}` : '';
    fail(`git ${args[0]} 失败。${detail}`);
  }
  return result.stdout ?? '';
}

function assertSshKey(repo: ContentRepoEnv): void {
  if (!repo.sshKey) return;
  const keyPath = resolveKeyPath(root, repo.sshKey);
  if (!existsSync(keyPath) || !statSync(keyPath).isFile()) {
    fail(`找不到 SSH 私钥文件：${keyPath}`);
  }
}

function clone(repo: ContentRepoEnv, targetDir: string): void {
  const relative = toPosix(path.relative(root, targetDir)) || targetDir;
  if (existsSync(targetDir)) {
    if (isGitRepo(targetDir)) {
      console.log(`[daybook:content] 内容仓库已存在：${relative}，跳过克隆。`);
      return;
    }
    if (!statSync(targetDir).isDirectory()) {
      fail(`目标路径不是目录：${relative}`);
    }
    if (isNonEmptyDir(targetDir)) {
      fail(`目标目录非空且不是 Git 仓库：${relative}；请换一个 CONTENT_REPO_DIR，或先清理该目录。`);
    }
  } else {
    mkdirSync(path.dirname(targetDir), { recursive: true });
  }

  const args = ['clone'];
  if (repo.branch) args.push('--branch', repo.branch);
  args.push(repo.url, targetDir);
  console.log(`[daybook:content] 正在克隆内容仓库到 ${relative} …`);
  runGit(args, repo);
  console.log('[daybook:content] 内容仓库已就绪。开发：pnpm dev:content；构建：pnpm build:content。');
}

function pull(repo: ContentRepoEnv, targetDir: string): void {
  const relative = toPosix(path.relative(root, targetDir)) || targetDir;
  if (!existsSync(targetDir) || !isGitRepo(targetDir)) {
    fail(`内容仓库不存在：${relative}。请先运行 pnpm content:clone。`);
  }

  const args = ['-C', targetDir, 'pull', '--ff-only'];
  if (repo.branch) args.push('origin', repo.branch);
  console.log(`[daybook:content] 正在拉取 ${relative} …`);
  runGit(args, repo);
  console.log('[daybook:content] 内容仓库已更新。');
}

function usage(): never {
  fail('用法：node --import tsx scripts/content-repo.ts <clone|pull>');
}

function main(): void {
  const [action, ...rest] = process.argv.slice(2);
  if (!action || !['clone', 'pull'].includes(action) || rest.length > 0) usage();

  loadDotEnv();
  const repo = readContentRepoEnv();
  assertSshKey(repo);
  const targetDir = resolveTargetDir(root, repo.dir);

  if (action === 'clone') {
    clone(repo, targetDir);
  } else {
    pull(repo, targetDir);
  }
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
