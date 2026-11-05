import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  buildSshCommand,
  type ContentRepoEnv,
  gitEnvForRepo,
  isHttpUrl,
  isSshUrl,
  readContentRepoEnv,
  redactGitText,
  redactGitUrl,
  resolveKeyPath,
  resolveTargetDir,
} from '../../scripts/content-repo-lib';

const root = path.resolve(process.cwd(), 'theme-under-test');

test('git URL schemes are recognized', () => {
  assert.equal(isHttpUrl('https://example.com/you/content.git'), true);
  assert.equal(isHttpUrl('http://example.com/you/content.git'), true);
  assert.equal(isHttpUrl('git@example.com:you/content.git'), false);
  assert.equal(isSshUrl('git@example.com:you/content.git'), true);
  assert.equal(isSshUrl('ssh://git@example.com/you/content.git'), true);
  assert.equal(isSshUrl('https://example.com/you/content.git'), false);
  assert.equal(isSshUrl('https://oauth2:inline-token@example.com/you/content.git'), false);
});

test('the target directory cannot be empty or the theme root', () => {
  assert.equal(resolveTargetDir(root, 'content'), path.join(root, 'content'));
  assert.throws(() => resolveTargetDir(root, '  '), /不能为空/);
  assert.throws(() => resolveTargetDir(root, '.'), /主题仓库根目录/);
});

test('SSH key paths support ~ and relative paths', () => {
  assert.equal(resolveKeyPath(root, 'keys/deploy'), path.join(root, 'keys', 'deploy'));
  assert.match(resolveKeyPath(root, '~/.ssh/id_ed25519'), /[\\/]\.ssh[\\/]id_ed25519$/);
});

test('SSH commands quote the key path and disable prompts', () => {
  const command = buildSshCommand('C:\\keys with space\\id_ed25519');
  assert.match(command, /^ssh -i "/);
  assert.match(command, /IdentitiesOnly=yes/);
  assert.match(command, /BatchMode=yes/);
});

test('HTTP credentials and query tokens are redacted', () => {
  const url = 'https://oauth2:secret-token@example.com/you/content.git?private_token=query-secret';
  const redacted = redactGitUrl(url);
  assert.doesNotMatch(redacted, /secret-token|query-secret/);
  assert.match(redacted, /\*\*\*/);

  const text = `fatal: could not read ${url}\n`;
  const cleaned = redactGitText(text, url);
  assert.doesNotMatch(cleaned, /secret-token|query-secret/);

  // Git 会把地址规范化（去掉账号密码、补尾斜杠），失败输出里仍可能带 query token。
  const normalized = "fatal: repository 'http://127.0.0.1:8765/missing.git?private_token=query-secret/' not found";
  assert.doesNotMatch(redactGitText(normalized, url), /query-secret/);
});

test('SSH and malformed URLs survive redaction', () => {
  assert.equal(redactGitUrl('git@example.com:you/content.git'), 'git@example.com:you/content.git');
  assert.doesNotThrow(() => redactGitUrl('not a url'));
});

test('environment parsing requires a URL and an SSH key for SSH remotes', () => {
  assert.throws(() => readContentRepoEnv({} as NodeJS.ProcessEnv), /CONTENT_REPO_URL/);
  assert.throws(
    () => readContentRepoEnv({ CONTENT_REPO_URL: 'ftp://example.com/content.git' } as NodeJS.ProcessEnv),
    /必须.*http\(s\) 或 ssh/,
  );
  assert.throws(
    () => readContentRepoEnv({ CONTENT_REPO_URL: 'git@example.com:you/content.git' } as NodeJS.ProcessEnv),
    /CONTENT_REPO_SSH_KEY/,
  );
});

test('environment parsing applies defaults and keeps HTTP credentials', () => {
  const repo = readContentRepoEnv({
    CONTENT_REPO_URL: 'https://oauth2:inline-token@example.com/you/content.git',
  } as NodeJS.ProcessEnv);
  assert.equal(repo.dir, 'content');
  assert.equal(repo.branch, undefined);
  assert.match(repo.url, /inline-token/);

  assert.doesNotThrow(() =>
    readContentRepoEnv({ CONTENT_REPO_URL: 'http://oauth2:token@example.com/you/content.git' } as NodeJS.ProcessEnv),
  );

  const ssh = readContentRepoEnv({
    CONTENT_REPO_URL: 'git@example.com:you/content.git',
    CONTENT_REPO_DIR: 'content-repo',
    CONTENT_REPO_BRANCH: 'main',
    CONTENT_REPO_SSH_KEY: 'keys/id_ed25519',
  } as NodeJS.ProcessEnv);
  assert.equal(ssh.dir, 'content-repo');
  assert.equal(ssh.branch, 'main');
  assert.equal(ssh.sshKey, 'keys/id_ed25519');
});

test('git environment disables prompts and wires the SSH key', () => {
  const repo: ContentRepoEnv = {
    url: 'git@example.com:you/content.git',
    dir: 'content',
    sshKey: 'keys/id_ed25519',
  };
  const env = gitEnvForRepo(repo, root);
  assert.equal(env.GIT_TERMINAL_PROMPT, '0');
  assert.match(env.GIT_SSH_COMMAND ?? '', /-i "/);
  assert.ok((env.GIT_SSH_COMMAND ?? '').includes(root));
});
