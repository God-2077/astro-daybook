import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildInstallArgs,
  readContentDependencies,
  resolveContentRepoDir,
  resolvePnpmInvocation,
} from '../../scripts/content-install';

const root = process.cwd();

function withContentRepo(run: (contentRoot: string) => void): void {
  const contentRoot = mkdtempSync(path.join(tmpdir(), 'daybook-content-install-'));
  try {
    run(contentRoot);
  } finally {
    rmSync(contentRoot, { recursive: true, force: true });
  }
}

function writeManifest(contentRoot: string, manifest: unknown): void {
  writeFileSync(path.join(contentRoot, 'package.json'), JSON.stringify(manifest), 'utf8');
}

test('content repo directory defaults to content', () => {
  assert.equal(resolveContentRepoDir({ env: {} }), path.join(root, 'content'));
});

test('content repo directory honors CONTENT_REPO_DIR', () => {
  assert.equal(resolveContentRepoDir({ env: { CONTENT_REPO_DIR: 'content-repo' } }), path.join(root, 'content-repo'));
});

test('CONTENT_REPO takes precedence over CONTENT_REPO_DIR', () => {
  assert.equal(
    resolveContentRepoDir({ env: { CONTENT_REPO: 'from-content-repo', CONTENT_REPO_DIR: 'from-content-repo-dir' } }),
    path.join(root, 'from-content-repo'),
  );
});

test('disabled CONTENT_REPO means theme mode', () => {
  for (const value of ['', '0', 'false', 'FALSE', 'off', 'no']) {
    assert.equal(resolveContentRepoDir({ env: { CONTENT_REPO: value } }), null);
  }
});

test('explicit content repo wins over the environment', () => {
  assert.equal(
    resolveContentRepoDir({ explicitDir: 'explicit-content', env: { CONTENT_REPO: 'off', CONTENT_REPO_DIR: 'other' } }),
    path.join(root, 'explicit-content'),
  );
});

test('explicit content repo cannot be a disabled value', () => {
  assert.throws(() => resolveContentRepoDir({ explicitDir: 'off', env: {} }), /不能是空值或停用值/);
});

test('a missing content repository package.json has no dependencies', () => {
  withContentRepo((contentRoot) => {
    assert.deepEqual(readContentDependencies(contentRoot), []);
  });
});

test('dependency names from all dependency fields are merged and sorted', () => {
  withContentRepo((contentRoot) => {
    writeManifest(contentRoot, {
      dependencies: { zebra: '^1.0.0', alpha: '^1.0.0' },
      devDependencies: { middle: '^1.0.0' },
      optionalDependencies: { alpha: '^2.0.0', omega: '^1.0.0' },
    });
    assert.deepEqual(readContentDependencies(contentRoot), ['alpha', 'middle', 'omega', 'zebra']);
  });
});

test('an invalid content repository manifest reports its path', () => {
  withContentRepo((contentRoot) => {
    const packageFile = path.join(contentRoot, 'package.json');
    writeFileSync(packageFile, '{ nope', 'utf8');
    const pattern = new RegExp(`不是有效 JSON：${escapeRegExp(packageFile)}`);
    assert.throws(() => readContentDependencies(contentRoot), pattern);
  });
});

test('non-object dependency fields are rejected', () => {
  withContentRepo((contentRoot) => {
    writeManifest(contentRoot, { dependencies: ['broken'] });
    assert.throws(() => readContentDependencies(contentRoot), /dependencies 必须是对象/);
  });
});

test('non-object manifests are rejected', () => {
  withContentRepo((contentRoot) => {
    writeManifest(contentRoot, ['broken']);
    assert.throws(() => readContentDependencies(contentRoot), /必须是对象/);
  });
});

test('install arguments are stable and can be frozen for CI', () => {
  const contentRoot = path.join('theme-under-test', 'content');
  assert.deepEqual(buildInstallArgs(contentRoot), ['--dir', contentRoot, 'install', '--ignore-workspace', '--prefer-offline']);
  assert.deepEqual(buildInstallArgs(contentRoot, { frozenLockfile: true }), [
    '--dir',
    contentRoot,
    'install',
    '--ignore-workspace',
    '--prefer-offline',
    '--frozen-lockfile',
  ]);
});

test('pnpm invocations handle JavaScript entrypoints and platform executables', () => {
  const js = resolvePnpmInvocation({ npm_execpath: 'C:/tools/pnpm.cjs' });
  assert.deepEqual(js, { command: process.execPath, args: ['C:/tools/pnpm.cjs'] });

  const executable = resolvePnpmInvocation({ npm_execpath: 'C:/tools/pnpm.exe' });
  assert.deepEqual(executable, { command: 'C:/tools/pnpm.exe', args: [] });

  if (process.platform === 'win32') {
    assert.equal(resolvePnpmInvocation({}), null);
    assert.equal(resolvePnpmInvocation({ npm_execpath: 'C:/tools/pnpm.cmd' }), null);
  } else {
    assert.deepEqual(resolvePnpmInvocation({}), { command: 'pnpm', args: [] });
    assert.deepEqual(resolvePnpmInvocation({ npm_execpath: 'C:/tools/pnpm.cmd' }), {
      command: 'C:/tools/pnpm.cmd',
      args: [],
    });
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
