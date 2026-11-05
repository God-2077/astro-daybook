import { existsSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface ContentRepoEnv {
  url: string;
  dir: string;
  sshKey?: string;
  branch?: string;
}

const SECRET_QUERY_KEYS = ['token', 'access_token', 'private_token', 'key'];

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSshUrl(value: string): boolean {
  // HTTP(S) 可能内联 oauth2:token@host，优先按 HTTP 判断，避免误当成 scp-like 地址。
  if (isHttpUrl(value)) return false;
  if (value.startsWith('ssh://')) return true;
  // git@github.com:org/repo.git 这类 scp-like 地址。
  return /^[^@\s]+@[^:\s]+:/.test(value);
}

export function resolveTargetDir(root: string, dir: string): string {
  const value = dir.trim();
  if (!value) throw new Error('CONTENT_REPO_DIR 不能为空');
  const target = path.resolve(root, value);
  if (target === path.resolve(root)) {
    throw new Error('内容仓库不能克隆到主题仓库根目录；请修改 CONTENT_REPO_DIR。');
  }
  return target;
}

export function resolveKeyPath(root: string, key: string): string {
  const value = key.trim();
  if (!value) return value;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) return path.join(os.homedir(), value.slice(2));
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

export function buildSshCommand(keyPath: string): string {
  return `ssh -i "${keyPath.replace(/"/g, '\\"')}" -o IdentitiesOnly=yes -o BatchMode=yes`;
}

export function redactGitUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.username) url.username = '***';
    if (url.password) url.password = '***';
    for (const key of SECRET_QUERY_KEYS) {
      if (url.searchParams.has(key)) url.searchParams.set(key, '***');
    }
    return url.toString();
  } catch {
    return raw.replace(/\/\/[^/@\s]+@/g, '//***@').replace(/([?&](?:token|access_token|private_token|key)=)[^&\s]+/gi, '$1***');
  }
}

export function redactGitText(text: string, url: string): string {
  return text
    .replaceAll(url, redactGitUrl(url))
    .replace(/(https?:\/\/)([^@\s/]+)@/gi, '$1***@')
    .replace(/([?&](?:token|access_token|private_token|key)=)[^&\s'"]+/gi, '$1***');
}

export function isGitRepo(dir: string): boolean {
  return existsSync(path.join(dir, '.git'));
}

export function isNonEmptyDir(dir: string): boolean {
  return existsSync(dir) && statSync(dir).isDirectory() && readdirSync(dir).length > 0;
}

export function readContentRepoEnv(env: NodeJS.ProcessEnv = process.env): ContentRepoEnv {
  const url = (env.CONTENT_REPO_URL ?? '').trim();
  if (!url) {
    throw new Error('缺少 CONTENT_REPO_URL；请在 .env 中填写 http(s) 或 ssh 克隆地址（见 docs/dual-repo.md）。');
  }
  if (!isHttpUrl(url) && !isSshUrl(url)) {
    throw new Error('CONTENT_REPO_URL 必须是 http(s) 或 ssh 地址。');
  }

  const sshKey = (env.CONTENT_REPO_SSH_KEY ?? '').trim() || undefined;
  if (isSshUrl(url) && !sshKey) {
    throw new Error('SSH 地址需要配置 CONTENT_REPO_SSH_KEY；请填写私钥路径（见 docs/dual-repo.md）。');
  }

  return {
    url,
    dir: (env.CONTENT_REPO_DIR ?? '').trim() || 'content',
    sshKey,
    branch: (env.CONTENT_REPO_BRANCH ?? '').trim() || undefined,
  };
}

export function gitEnvForRepo(repo: ContentRepoEnv, root: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  if (repo.sshKey) {
    env.GIT_SSH_COMMAND = buildSshCommand(resolveKeyPath(root, repo.sshKey));
  }
  return env;
}
