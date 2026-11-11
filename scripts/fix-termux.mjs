#!/usr/bin/env node
/**
 * Termux / Android 构建兼容性修复（对应 docs/termux.md）。
 *
 * Astro 7 的配置 schema 会在加载阶段 import `@astrojs/markdown-satteri`，即使项目
 * 使用 unified()，也会触发 satteri 的原生绑定加载；satteri 没有 Android 原生包，
 * 需要 WASI 回退，而 WASI 默认把 "/" 设为 preopen，Android 上会报 UVWASI_EACCES。
 * Pagefind 则没有 android-arm64 包，但 linux-arm64 的静态二进制可以直接执行。
 *
 * 脚本做四件事，并且可以重复执行：
 *   1. 在 pnpm-workspace.yaml 写入 supportedArchitectures（让 pnpm 安装 linux-arm64 可选包）；
 *   2. 生成 patches/ 下的两个补丁，并注册 patchedDependencies；
 *   3. 把 @bruits/satteri-wasm32-wasi 与 @img/sharp-wasm32 加进 devDependencies
 *      （sharp 没有 Android 原生包，Astro 图片优化需要 wasm 回退）；
 *   4. 执行 pnpm install，并验证 Sätteri / Pagefind / sharp 是否可用。
 *
 * 用法：pnpm fix:termux [--dry-run] [--no-install] [--reinstall] [--build] [--force]
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TAG = '[daybook:termux]';
// 仓库目录取自当前工作目录：脚本需要在仓库根目录运行（pnpm fix:termux 也是如此）。
const ROOT = process.cwd();
const PACKAGE_FILE = path.join(ROOT, 'package.json');
const WORKSPACE_FILE = path.join(ROOT, 'pnpm-workspace.yaml');
const LOCKFILE_FILE = path.join(ROOT, 'pnpm-lock.yaml');
const PATCH_DIR = path.join(ROOT, 'patches');
const MODULES_DIR = path.join(ROOT, 'node_modules');
const VIRTUAL_STORE = path.join(MODULES_DIR, '.pnpm');
const SATTERI_WASI = '@bruits/satteri-wasm32-wasi';
const MANAGED_PACKAGES = new Set([SATTERI_WASI, 'pagefind']);

const PAGEFIND_ORIGINAL_LINE = 'const platform = process.platform === "win32" ? "windows" : process.platform;';

/* ------------------------------------------------------------------ */
/* 输出                                                                */
/* ------------------------------------------------------------------ */

function info(message) {
  console.log(`${TAG} ${message}`);
}

function warn(message) {
  console.warn(`${TAG} 警告：${message}`);
}

function fail(message) {
  console.error(`${TAG} ${message}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 参数                                                                */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const options = { dryRun: false, install: true, reinstall: false, build: false, force: false, help: false };
  for (const arg of argv) {
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-install':
        options.install = false;
        break;
      case '--reinstall':
        options.reinstall = true;
        break;
      case '--build':
        options.build = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        fail(`未知参数：${arg}。运行 node scripts/fix-termux.mjs --help 查看用法。`);
    }
  }
  if (options.reinstall && !options.install) {
    fail('--reinstall 与 --no-install 不能同时使用。');
  }
  return options;
}

function printHelp() {
  console.log(`用法：node scripts/fix-termux.mjs [选项]

选项：
  --dry-run     只检查并打印将要做的修改，不写入文件、不安装依赖
  --no-install  只写入配置与补丁，不执行 pnpm install
  --reinstall   先删除 node_modules 再安装（补丁没有生效时使用）
  --build       修复完成后执行一次 pnpm build
  --force       不在 Android 上也写入修复（补丁本身跨平台安全）
  -h, --help    显示本帮助

对应文档：docs/termux.md`);
}

/* ------------------------------------------------------------------ */
/* 通用工具                                                            */
/* ------------------------------------------------------------------ */

function readTextIfExists(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function writeTextIfChanged(file, content) {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return false;
  writeFileSync(file, content);
  return true;
}

function isDirectory(target) {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function unquote(value) {
  const text = value.trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(1, -1);
    }
  }
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text;
}

function quoteKey(value) {
  return JSON.stringify(value);
}

function quotePath(value) {
  return /^[A-Za-z0-9_./@+-]+$/.test(value) ? value : quoteKey(value);
}

function unique(values) {
  return [...new Set(values)];
}

function compareVersions(a, b) {
  return a.localeCompare(b, 'en', { numeric: true });
}

/* ------------------------------------------------------------------ */
/* 版本与已安装包                                                      */
/* ------------------------------------------------------------------ */

function virtualStoreEntries(name) {
  if (!isDirectory(VIRTUAL_STORE)) return [];
  const prefix = `${name.replace('/', '+')}@`;
  return readdirSync(VIRTUAL_STORE)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => {
      const rest = entry.slice(prefix.length);
      const version = rest.split(/[(_]/)[0];
      return { dir: path.join(VIRTUAL_STORE, entry), version };
    })
    .filter((entry) => /^\d+\.\d+\.\d+/.test(entry.version));
}

function installedPackageDirs(name, version) {
  return virtualStoreEntries(name)
    .filter((entry) => entry.version === version)
    .map((entry) => path.join(entry.dir, 'node_modules', name))
    .filter((dir) => isDirectory(dir));
}

function installedVersion(name) {
  const versions = virtualStoreEntries(name).map((entry) => entry.version);
  if (versions.length === 0) return null;
  return versions.sort(compareVersions).at(-1);
}

function lockfileVersion(name) {
  const text = readTextIfExists(LOCKFILE_FILE);
  if (!text) return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^\\s{2}'?${escaped}@(\\d+\\.\\d+\\.\\d+[^'\\s:()]*)'?:$`, 'm'));
  return match ? match[1] : null;
}

function exactVersion(spec) {
  if (typeof spec !== 'string') return null;
  const value = spec.trim().replace(/^[~^=]/, '');
  return /^\d+\.\d+\.\d+/.test(value) ? value : null;
}

/* ------------------------------------------------------------------ */
/* pnpm-workspace.yaml                                                 */
/* ------------------------------------------------------------------ */

function findTopLevelKey(lines, key) {
  return lines.findIndex((line) => line === `${key}:` || line.startsWith(`${key}: `));
}

function splitInlineList(value) {
  return value
    .split(',')
    .map((item) => unquote(item))
    .filter(Boolean);
}

function readSupportedArchitectures(lines, start) {
  const result = { os: [], cpu: [], libc: [] };
  let current = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) break;
    const line = raw.trim();
    const field = line.match(/^([A-Za-z]+):(.*)$/);
    if (field) {
      const [, name, rest] = field;
      if (!Object.hasOwn(result, name)) return null;
      current = name;
      const inline = rest.trim();
      if (inline) {
        const list = inline.match(/^\[(.*)\]$/);
        if (!list) return null;
        result[name] = splitInlineList(list[1]);
      } else {
        result[name] = [];
      }
      continue;
    }
    const item = line.match(/^-\s*(.+)$/);
    if (!item || !current) return null;
    result[current].push(unquote(item[1].trim()));
  }
  return result;
}

function upsertTopLevelBlock(text, key, bodyLines) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const start = findTopLevelKey(lines, key);
  const block = [`${key}:`, ...bodyLines];

  if (start === -1) {
    if (lines.length > 0) lines.push('');
    lines.push(...block);
    return `${lines.join('\n')}\n`;
  }

  let end = start + 1;
  while (end < lines.length && (lines[end] === '' || /^\s/.test(lines[end]))) end += 1;
  lines.splice(start, end - start, ...block);

  const next = start + block.length;
  if (next < lines.length && lines[next] !== '') lines.splice(next, 0, '');
  return `${lines.join('\n')}\n`;
}

function ensureSupportedArchitectures(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = findTopLevelKey(lines, 'supportedArchitectures');
  let current = { os: [], cpu: [], libc: [] };
  if (start !== -1) {
    const parsed = readSupportedArchitectures(lines, start);
    if (!parsed) {
      fail('pnpm-workspace.yaml 里的 supportedArchitectures 结构无法识别，请改成 block 列表后重试。');
    }
    current = parsed;
  }

  const merged = {
    os: unique([...current.os, 'current', 'linux']),
    cpu: unique([...current.cpu, 'current']),
    libc: unique([...current.libc, 'current']),
  };

  const body = [];
  for (const key of ['os', 'cpu', 'libc']) {
    body.push(`  ${key}:`);
    for (const value of merged[key]) body.push(`    - ${value}`);
  }
  return upsertTopLevelBlock(text, 'supportedArchitectures', body);
}

function packageNameOfDependencyKey(key) {
  const index = key.lastIndexOf('@');
  return index > 0 ? key.slice(0, index) : key;
}

function isManagedPatchFile(name, value) {
  const base = path.basename(value);
  if (name === SATTERI_WASI) return /^@bruits__satteri-wasm32-wasi@.+\.patch$/.test(base);
  if (name === 'pagefind') return /^pagefind@.+\.patch$/.test(base);
  return false;
}

function ensurePatchedDependencies(text, desired) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = findTopLevelKey(lines, 'patchedDependencies');
  const entries = new Map();

  if (start !== -1) {
    for (let index = start + 1; index < lines.length; index += 1) {
      const raw = lines[index];
      if (!raw.trim() || raw.trim().startsWith('#')) continue;
      if (!/^\s/.test(raw)) break;
      const match = raw.trim().match(/^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:]+?)\s*:\s*(.+)$/);
      if (!match) {
        fail('pnpm-workspace.yaml 里的 patchedDependencies 结构无法识别，请修正后重试。');
      }
      entries.set(unquote(match[1]), unquote(match[2]));
    }
  }

  // 版本升级后清掉脚本自己写入的旧条目，用户自定义的补丁保持不变。
  for (const [key, value] of [...entries]) {
    const name = packageNameOfDependencyKey(key);
    if (!MANAGED_PACKAGES.has(name)) continue;
    if (!desired.has(key) && isManagedPatchFile(name, value)) entries.delete(key);
  }
  for (const [key, value] of desired) entries.set(key, value);

  const body = [...entries].map(([key, value]) => `  ${quoteKey(key)}: ${quotePath(value)}`);
  return upsertTopLevelBlock(text, 'patchedDependencies', body);
}

/* ------------------------------------------------------------------ */
/* package.json                                                        */
/* ------------------------------------------------------------------ */

function setSortedKey(target, key, value) {
  if (Object.hasOwn(target, key)) {
    if (target[key] === value) return false;
    target[key] = value;
    return true;
  }
  const entries = Object.entries(target);
  const index = entries.findIndex(([name]) => name.localeCompare(key, 'en') > 0);
  entries.splice(index === -1 ? entries.length : index, 0, [key, value]);
  for (const name of Object.keys(target)) delete target[name];
  for (const [name, item] of entries) target[name] = item;
  return true;
}

/* ------------------------------------------------------------------ */
/* 补丁生成                                                            */
/* ------------------------------------------------------------------ */

function exactEdit(filePath, original, patched) {
  return {
    path: filePath,
    isPatched: (text) => text.includes(patched),
    toPatched: (text) => (text.includes(patched) ? text : text.includes(original) ? text.replace(original, patched) : null),
    toOriginal: (text) => text.replace(patched, original),
  };
}

function platformBlock(indent) {
  return [
    `${indent}const platform =`,
    `${indent}  process.platform === "win32"`,
    `${indent}    ? "windows"`,
    `${indent}    : process.platform === "android"`,
    `${indent}      ? "linux"`,
    `${indent}      : process.platform;`,
  ].join('\n');
}

const PAGEFIND_EDIT = {
  path: 'lib/resolveBinary.js',
  isPatched: (text) => text.includes('process.platform === "android"'),
  toPatched: (text) => {
    if (text.includes('process.platform === "android"')) return text;
    const match = text.match(
      /^([ \t]*)const platform = process\.platform === "win32" \? "windows" : process\.platform;[ \t]*$/m,
    );
    return match ? text.replace(match[0], platformBlock(match[1])) : null;
  },
  toOriginal: (text) => {
    const match = text.match(
      /^([ \t]*)const platform =\n[ \t]*process\.platform === "win32"\n[ \t]*\? "windows"\n[ \t]*: process\.platform === "android"\n[ \t]*\? "linux"\n[ \t]*: process\.platform;[ \t]*$/m,
    );
    return match ? text.replace(match[0], `${match[1]}${PAGEFIND_ORIGINAL_LINE}`) : null;
  },
};

const SATTERI_EDITS = [
  exactEdit(
    'satteri_napi.wasi.cjs',
    'const __rootDir = __nodePath.parse(process.cwd()).root',
    'const __rootDir = process.cwd()',
  ),
  exactEdit('wasi-worker.mjs', 'const __rootDir = parse(process.cwd()).root;', 'const __rootDir = process.cwd();'),
];

function editPair(edit, text) {
  if (edit.isPatched(text)) {
    const before = edit.toOriginal(text);
    if (before === null) return null;
    const after = edit.toPatched(before);
    return after === null ? null : { before, after };
  }
  const after = edit.toPatched(text);
  return after === null ? null : { before: text, after };
}

function splitLines(text) {
  if (!text.endsWith('\n')) throw new Error('文件末尾没有换行，无法生成 unified diff');
  return text.slice(0, -1).split('\n');
}

function diffLines(before, after) {
  const rows = before.length;
  const cols = after.length;
  const table = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (before[i] === after[j]) {
      ops.push({ type: 'context', text: before[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ type: 'remove', text: before[i] });
      i += 1;
    } else {
      ops.push({ type: 'add', text: after[j] });
      j += 1;
    }
  }
  while (i < rows) {
    ops.push({ type: 'remove', text: before[i] });
    i += 1;
  }
  while (j < cols) {
    ops.push({ type: 'add', text: after[j] });
    j += 1;
  }
  return ops;
}

function buildHunks(ops, context = 3) {
  const offsets = [];
  let beforeLine = 1;
  let afterLine = 1;
  for (const op of ops) {
    offsets.push({ before: beforeLine, after: afterLine });
    if (op.type !== 'add') beforeLine += 1;
    if (op.type !== 'remove') afterLine += 1;
  }

  const changed = [];
  ops.forEach((op, index) => {
    if (op.type !== 'context') changed.push(index);
  });
  if (changed.length === 0) return [];

  const ranges = [];
  let start = changed[0];
  let end = changed[0];
  for (const index of changed.slice(1)) {
    if (index - end <= context * 2 + 1) {
      end = index;
    } else {
      ranges.push([start, end]);
      start = index;
      end = index;
    }
  }
  ranges.push([start, end]);

  return ranges.map(([first, last]) => {
    const from = Math.max(0, first - context);
    const to = Math.min(ops.length - 1, last + context);
    const slice = ops.slice(from, to + 1);
    const beforeCount = slice.filter((op) => op.type !== 'add').length;
    const afterCount = slice.filter((op) => op.type !== 'remove').length;
    const beforeStart = beforeCount === 0 ? offsets[from].before - 1 : offsets[from].before;
    const afterStart = afterCount === 0 ? offsets[from].after - 1 : offsets[from].after;
    const lines = slice.map((op) => {
      const prefix = op.type === 'add' ? '+' : op.type === 'remove' ? '-' : ' ';
      return `${prefix}${op.text}`;
    });
    return { header: `@@ -${beforeStart},${beforeCount} +${afterStart},${afterCount} @@`, lines };
  });
}

function createPatch(files) {
  const chunks = [];
  for (const file of files) {
    const hunks = buildHunks(diffLines(splitLines(file.before), splitLines(file.after)));
    if (hunks.length === 0) continue;
    chunks.push(`diff --git a/${file.path} b/${file.path}`);
    chunks.push(`--- a/${file.path}`);
    chunks.push(`+++ b/${file.path}`);
    for (const hunk of hunks) {
      chunks.push(hunk.header);
      chunks.push(...hunk.lines);
    }
  }
  return chunks.length === 0 ? '' : `${chunks.join('\n')}\n`;
}

function buildPatch(target) {
  for (const dir of installedPackageDirs(target.name, target.version)) {
    const files = [];
    let complete = true;
    for (const edit of target.edits) {
      const file = path.join(dir, edit.path);
      if (!existsSync(file)) {
        complete = false;
        break;
      }
      const pair = editPair(edit, readFileSync(file, 'utf8'));
      if (!pair) {
        complete = false;
        break;
      }
      files.push({ path: edit.path, ...pair });
    }
    if (complete) return createPatch(files);
  }
  return null;
}

function applyPatchToModules(target) {
  const dirs = installedPackageDirs(target.name, target.version);
  let written = 0;
  let found = 0;
  let patchedDirs = 0;

  for (const dir of dirs) {
    let dirPatched = true;
    for (const edit of target.edits) {
      const file = path.join(dir, edit.path);
      if (!existsSync(file)) {
        dirPatched = false;
        continue;
      }
      found += 1;
      const text = readFileSync(file, 'utf8');
      if (edit.isPatched(text)) continue;
      dirPatched = false;
      const patched = edit.toPatched(text);
      if (patched === null) continue;
      writeFileSync(file, patched);
      written += 1;
    }
    if (dirPatched) patchedDirs += 1;
  }

  return { written, found, patchedDirs, dirs: dirs.length };
}

/* ------------------------------------------------------------------ */
/* pnpm 与验证                                                         */
/* ------------------------------------------------------------------ */

function runPnpm(args) {
  // pnpm 的 optimisticRepeatInstall 只比较 lockfile 与 node_modules，
  // 工作区配置（supportedArchitectures / patchedDependencies）变化时会被跳过，
  // 这里显式关闭，确保设置真正生效。
  const fullArgs = args[0] === 'install' ? [...args, '--config.optimistic-repeat-install=false'] : args;
  info(`执行：pnpm ${fullArgs.join(' ')}`);
  const result = spawnSync('pnpm', fullArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, npm_config_confirm_modules_purge: 'false' },
  });
  if (result.error) fail(`无法执行 pnpm：${result.error.message}`);
  if (result.status !== 0) fail(`pnpm ${args[0]} 失败（退出码 ${result.status}）。`);
}

function verifySatteri(version) {
  const dir = installedPackageDirs('satteri', version)[0];
  if (!dir) fail(`验证失败：找不到 satteri@${version}。`);
  const entry = path.join(dir, 'index.js');
  if (!existsSync(entry)) fail(`验证失败：找不到 ${path.relative(ROOT, entry)}。`);

  const code = [
    "const { createRequire } = require('node:module');",
    'const requireFrom = createRequire(process.env.SATTERI_ENTRY);',
    "const satteri = requireFrom('satteri');",
    "console.log('satteri OK ' + Object.keys(satteri).length);",
  ].join('\n');

  const result = spawnSync(process.execPath, ['-e', code], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, SATTERI_ENTRY: entry, NODE_NO_WARNINGS: '1' },
  });
  if (result.status !== 0 || !/satteri OK \d+/.test(result.stdout ?? '')) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`Sätteri 无法加载${detail ? `：\n${detail}` : '。'}`);
  }
  info(result.stdout.trim());
}

function verifyPagefind(version) {
  const bin = path.join(MODULES_DIR, '.bin', process.platform === 'win32' ? 'pagefind.cmd' : 'pagefind');
  if (!existsSync(bin)) fail('验证失败：node_modules/.bin/pagefind 不存在，请先执行 pnpm install。');

  const result = spawnSync(bin, ['--version'], { cwd: ROOT, encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.status !== 0 || !output.includes(version)) {
    fail(`Pagefind 无法执行${output ? `：\n${output}` : '。'}`);
  }
  info(output.split('\n').at(-1));
}

function verifySharp(version) {
  const code = ["const sharp = require('sharp');", "console.log('sharp OK ' + (sharp.versions?.sharp || 'wasm'));"].join('\n');
  const result = spawnSync(process.execPath, ['-e', code], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });
  if (result.status !== 0 || !/sharp OK /.test(result.stdout ?? '')) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`sharp 无法加载${detail ? `：\n${detail}` : '。'}`);
  }
  if (!result.stdout.includes(version)) {
    warn(`sharp 的版本是 ${result.stdout.trim()}，与 package.json 的 ${version} 不一致。`);
  }
  info(result.stdout.trim());
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

function detectVersions(pkg) {
  const satteriVersion = installedVersion('satteri') ?? lockfileVersion('satteri');
  if (!satteriVersion) {
    fail('无法确定 satteri 的版本：node_modules 与 pnpm-lock.yaml 里都没有记录。');
  }

  const wasiVersion = installedVersion(SATTERI_WASI) ?? satteriVersion;
  const pagefindVersion =
    installedVersion('pagefind') ?? lockfileVersion('pagefind') ?? exactVersion(pkg.devDependencies?.pagefind);
  if (!pagefindVersion) {
    fail('无法确定 pagefind 的版本：请检查 package.json 的 devDependencies.pagefind。');
  }

  // supportedArchitectures 收紧平台后，sharp 的原生包在 Android 上不可用，
  // 需要显式安装 wasm 回退（sharp 自己不会声明这个可选依赖）。
  const sharpVersion = installedVersion('sharp') ?? lockfileVersion('sharp') ?? exactVersion(pkg.dependencies?.sharp);
  if (!sharpVersion) {
    fail('无法确定 sharp 的版本：请检查 package.json 的 dependencies.sharp。');
  }

  return { satteriVersion, wasiVersion, pagefindVersion, sharpVersion };
}

function pagefindPlatformPackage() {
  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'android' ? 'linux' : process.platform;
  return `@pagefind/${platform}-${process.env.npm_config_arch || process.arch}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (process.platform !== 'android' && !options.force) {
    fail(`本脚本用于 Termux / Android，当前平台是 ${process.platform}。确实需要写入这些配置时请加 --force。`);
  }
  if (process.platform !== 'android') {
    warn(`当前平台是 ${process.platform}，仍会写入 Termux 修复配置（--force）。`);
  }

  info(`仓库目录：${ROOT}`);

  if (!existsSync(PACKAGE_FILE)) fail('找不到 package.json，请在 Daybook 仓库根目录运行。');
  const pkg = JSON.parse(readFileSync(PACKAGE_FILE, 'utf8'));

  const { satteriVersion, wasiVersion, pagefindVersion, sharpVersion } = detectVersions(pkg);
  info(`检测到 satteri ${satteriVersion}、pagefind ${pagefindVersion}、sharp ${sharpVersion}。`);

  // 1. package.json 先就位：WASI 与 sharp 的 wasm 回退必须先进入 node_modules，
  //    之后才能从这些包的文件里生成补丁。
  if (!pkg.devDependencies) pkg.devDependencies = {};
  if (!pkg.scripts) pkg.scripts = {};
  const devDependencies = pkg.devDependencies;
  let packageNeedsUpdate = setSortedKey(devDependencies, SATTERI_WASI, wasiVersion);
  packageNeedsUpdate = setSortedKey(devDependencies, '@img/sharp-wasm32', sharpVersion) || packageNeedsUpdate;
  if (!Object.hasOwn(pkg.scripts, 'fix:termux')) {
    pkg.scripts['fix:termux'] = 'node scripts/fix-termux.mjs';
    packageNeedsUpdate = true;
  }
  const packageAfter = `${JSON.stringify(pkg, null, 2)}\n`;

  const modulesMissing = !isDirectory(VIRTUAL_STORE);
  const hasWasiBeforeInstall = installedPackageDirs(SATTERI_WASI, wasiVersion).length > 0;
  const hasSharpWasmBeforeInstall = installedPackageDirs('@img/sharp-wasm32', sharpVersion).length > 0;

  if (!options.dryRun && !options.install && (modulesMissing || !hasWasiBeforeInstall)) {
    fail('--no-install 只能在依赖已经安装后使用：请先执行 pnpm install，或去掉该参数。');
  }

  if (!options.dryRun) {
    if (packageNeedsUpdate) {
      writeFileSync(PACKAGE_FILE, packageAfter);
      info(`更新 package.json（${SATTERI_WASI}@${wasiVersion}、@img/sharp-wasm32@${sharpVersion}）`);
    }
    if (options.install && (modulesMissing || packageNeedsUpdate || !hasWasiBeforeInstall || !hasSharpWasmBeforeInstall)) {
      runPnpm(['install']);
    }
  }

  const targets = [
    {
      name: SATTERI_WASI,
      version: wasiVersion,
      patchFileName: `@bruits__satteri-wasm32-wasi@${wasiVersion}.patch`,
      edits: SATTERI_EDITS,
    },
    {
      name: 'pagefind',
      version: pagefindVersion,
      patchFileName: `pagefind@${pagefindVersion}.patch`,
      edits: [PAGEFIND_EDIT],
    },
  ];

  // 2. 生成补丁内容（pnpm install 时应用，这里同时用于写入 patches/）。
  const patches = new Map();
  if (options.dryRun && installedPackageDirs(SATTERI_WASI, wasiVersion).length === 0) {
    info('[dry-run] Sätteri 的 WASI 包尚未安装，跳过补丁内容检查（安装后才能生成）。');
  } else {
    for (const target of targets) {
      const content = buildPatch(target);
      if (content === null) {
        fail(`找不到可修补的 ${target.name}@${target.version} 文件，请先执行 pnpm install。`);
      }
      if (content === '') {
        warn(`${target.name}@${target.version} 与补丁目标不一致（可能已升级），请更新脚本中的替换规则。`);
      }
      patches.set(target, content);
    }
  }

  if (options.dryRun) {
    for (const [target, content] of patches) {
      if (!content) continue;
      info(`[dry-run] ${target.patchFileName}：`);
      console.log(content);
    }
  }

  // 3. 写入 patches/ 并清理脚本自己产生的旧版本补丁。
  let patchesChanged = false;
  const expectedPatchFiles = new Set(targets.map((target) => target.patchFileName));
  if (!options.dryRun) {
    mkdirSync(PATCH_DIR, { recursive: true });
    for (const [target, content] of patches) {
      if (!content) continue;
      if (writeTextIfChanged(path.join(PATCH_DIR, target.patchFileName), content)) {
        info(`写入 patches/${target.patchFileName}`);
        patchesChanged = true;
      }
    }
    if (isDirectory(PATCH_DIR)) {
      for (const entry of readdirSync(PATCH_DIR)) {
        const managed = /^@bruits__satteri-wasm32-wasi@.+\.patch$/.test(entry) || /^pagefind@.+\.patch$/.test(entry);
        if (managed && !expectedPatchFiles.has(entry)) {
          rmSync(path.join(PATCH_DIR, entry), { force: true });
          info(`删除旧补丁 patches/${entry}`);
          patchesChanged = true;
        }
      }
    }
  } else {
    for (const target of targets) {
      const file = path.join(PATCH_DIR, target.patchFileName);
      const note = patches.size === 0 ? '（依赖安装后生成）' : existsSync(file) ? '（已存在）' : '';
      info(`[dry-run] 写入 patches/${target.patchFileName}${note}`);
    }
  }

  // 4. pnpm-workspace.yaml：supportedArchitectures + patchedDependencies。
  const desiredPatches = new Map(
    targets.map((target) => [`${target.name}@${target.version}`, `patches/${target.patchFileName}`]),
  );
  const workspaceBefore = readTextIfExists(WORKSPACE_FILE);
  const workspaceAfter = ensurePatchedDependencies(ensureSupportedArchitectures(workspaceBefore), desiredPatches);
  const workspaceChanged = workspaceAfter !== workspaceBefore;

  if (options.dryRun) {
    info(`[dry-run] supportedArchitectures、patchedDependencies ${workspaceChanged ? '需要更新' : '已是最新'}`);
    info(
      `[dry-run] devDependencies ${packageNeedsUpdate ? `加入 ${SATTERI_WASI}@${wasiVersion} 与 @img/sharp-wasm32@${sharpVersion}` : '已是最新'}`,
    );
    info('[dry-run] 未写入任何文件，也未执行 pnpm install。');
    return;
  }

  if (workspaceChanged) {
    writeFileSync(WORKSPACE_FILE, workspaceAfter);
    info('更新 pnpm-workspace.yaml（supportedArchitectures / patchedDependencies）');
  }

  // 5. 安装依赖：配置、补丁或可选包缺失时才执行。
  const hasWasi = installedPackageDirs(SATTERI_WASI, wasiVersion).length > 0;
  const hasSharpWasm = installedPackageDirs('@img/sharp-wasm32', sharpVersion).length > 0;
  const hasPagefindBinary = installedPackageDirs(pagefindPlatformPackage(), pagefindVersion).length > 0;
  const needInstall = workspaceChanged || patchesChanged || !hasWasi || !hasSharpWasm || !hasPagefindBinary;

  if (options.reinstall) {
    info('按 --reinstall 要求删除 node_modules 后重新安装。');
    rmSync(MODULES_DIR, { recursive: true, force: true });
    runPnpm(['install']);
  } else if (needInstall && options.install) {
    runPnpm(['install']);
  } else if (needInstall) {
    info('按 --no-install 跳过安装：配置已写入，补丁会在下次 pnpm install 时应用。');
  } else {
    info('依赖与补丁均已就绪，跳过 pnpm install。');
  }

  // 6. pnpm 偶尔不会重新落盘补丁（见 docs/termux.md 的注意事项），这里兜底改写已安装文件。
  for (const target of targets) {
    const { written, found, patchedDirs } = applyPatchToModules(target);
    if (found === 0) fail(`安装后仍找不到 ${target.name}@${target.version}，请执行 pnpm install 后重试。`);
    if (written > 0 && patchedDirs === 0) {
      warn(`${target.name} 的补丁没有落盘，已直接改写 node_modules 中的 ${written} 个文件。`);
      warn('补丁文件仍在 patches/ 中；如再次出现，运行 pnpm fix:termux --reinstall。');
    }
  }

  // 7. 验证。
  verifySatteri(satteriVersion);
  verifyPagefind(pagefindVersion);
  verifySharp(sharpVersion);
  info('Sätteri（WASI 回退）、Pagefind 与 sharp（wasm 回退）均可用。');

  if (options.build) {
    runPnpm(['build']);
  }

  info('修复完成。');
  info('不要使用 pnpm install --force：它会安装所有平台的可选依赖，可能写满磁盘。');
}

main();
