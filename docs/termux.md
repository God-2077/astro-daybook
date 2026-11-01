# Astro 7 在 Termux / Android 上的构建兼容性修复记录

## 前言

本文记录 Astro 7 项目在 Termux / Android 上将 `pnpm build` 从报错修复到可完整构建的实际步骤。

Astro 7 项目本身使用 `@astrojs/markdown-remark` 的 `unified()` 作为 Markdown processor，但其配置 schema 会在模块加载阶段导入 `@astrojs/markdown-satteri`。Sätteri 没有 Android 原生绑定，因此即使项目使用 `unified()`，仍会触发 Sätteri 的原生绑定加载。

## 测试环境

| 组件 | 版本 |
| --- | --- |
| Android | 14 / aarch64 |
| Node.js | 25.8.1 |
| pnpm | 11.0.9 |
| Astro | 7.4.2 |
| Pagefind | 1.5.2 |
| Sätteri | 0.10.5 |

---

## 1. Sätteri 没有 Android 原生绑定

### 现象

```text
Cannot find native binding. npm has a bug related to optional dependencies...
cause: Error: Cannot find module '@bruits/satteri-android-arm64'
```

`astro check` 在加载配置阶段就失败，尚未开始处理内容。

### 定位

`@astrojs/markdown-satteri` 依赖 `satteri`。`satteri@0.10.5` 的 `optionalDependencies` 只有：

```text
@bruits/satteri-linux-x64-gnu
@bruits/satteri-linux-arm64-gnu
@bruits/satteri-linux-x64-musl
@bruits/satteri-linux-arm64-musl
@bruits/satteri-darwin-x64
@bruits/satteri-darwin-arm64
@bruits/satteri-win32-x64-msvc
@bruits/satteri-win32-arm64-msvc
@bruits/satteri-wasm32-wasi
```

其中没有 `android-arm64`。不过 `satteri` 的 binding loader 包含 Android 分支和 WASI 回退：

```js
if (process.platform === 'android') {
  if (process.arch === 'arm64') {
    try { return require('./satteri_napi.android-arm64.node') } catch (e) { ... }
  }
}
...
if (!nativeBinding || forceWasi) {
  try {
    wasiBinding = require('@bruits/satteri-wasm32-wasi')
    nativeBinding = wasiBinding
  } catch (err) { ... }
}
```

因此直接使用 WASI 包即可，不需要编译 Android 原生模块。

### 修复

安装 WASI 回退：

```bash
pnpm add -D @bruits/satteri-wasm32-wasi@0.10.5
```

安装后，`satteri` 能找到 WASI binding，但会报第二个错误：

```text
Error: UVWASI_EACCES, uvwasi_init
```

原因是 WASI 初始化时把 `/` 作为 preopen：

```js
const __rootDir = __nodePath.parse(process.cwd()).root
const __wasi = new __nodeWASI({
  version: 'preview1',
  env: process.env,
  preopens: {
    [__rootDir]: __rootDir,
  }
})
```

Android 不允许预打开根目录，因此改为 `process.cwd()`：

```bash
pnpm patch @bruits/satteri-wasm32-wasi@0.10.5
```

编辑 pnpm 输出的临时目录：

`node_modules/.pnpm_patches/@bruits/satteri-wasm32-wasi@0.10.5/satteri_napi.wasi.cjs`

```diff
-const __rootDir = __nodePath.parse(process.cwd()).root
+const __rootDir = process.cwd()
```

`node_modules/.pnpm_patches/@bruits/satteri-wasm32-wasi@0.10.5/wasi-worker.mjs`

```diff
-const __rootDir = parse(process.cwd()).root;
+const __rootDir = process.cwd();
```

提交补丁：

```bash
pnpm patch-commit node_modules/.pnpm_patches/@bruits/satteri-wasm32-wasi@0.10.5
```

仓库中最终生成：

```text
patches/@bruits__satteri-wasm32-wasi@0.10.5.patch
```

### 注意事项

`pnpm patch-commit` 有时会显示 `Already up to date`，但已安装的 `node_modules` 里仍是旧文件。不要用 `pnpm install --force` 解决，直接删掉重装：

```bash
rm -rf node_modules
pnpm install --frozen-lockfile
```

验证 Sätteri 能加载：

```bash
node -e "
const { createRequire } = require('module');
const r = createRequire(process.cwd() + '/node_modules/.pnpm/satteri@0.10.5/node_modules/satteri/index.js');
const m = r('satteri');
console.log('satteri OK', Object.keys(m).length);
"
```

输出 `satteri OK 34`，并伴随一条 `ExperimentalWarning: WASI is an experimental feature`，属于正常现象。

---

## 2. Pagefind 缺少 Android 构建（若使用 Pagefind）

### 现象

`astro build` 已经完成，`postbuild` 阶段失败：

```text
$ pagefind --site dist
Failed to install either of [pagefind_extended, pagefind].
Most likely the platform android-arm64 is not yet a supported architecture.
```

### 定位

`pagefind/lib/resolveBinary.js` 直接按 `process.platform` 拼接包名：

```js
const cpu = process.env.npm_config_arch || os.arch();
const platform = process.platform === "win32" ? "windows" : process.platform;

for (const execname of execnames) {
  const executable = platform === "windows" ? `${execname}.exe` : execname;
  try {
    return require.resolve(`@pagefind/${platform}-${cpu}/bin/${executable}`);
  } catch (e) {}
}
```

没有 `@pagefind/android-arm64`。

但 `@pagefind/linux-arm64` 里的 `pagefind_extended` 是静态链接 musl 的 aarch64 二进制：

```text
ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV),
statically linked, stripped
```

在 Termux 上可以直接执行，不需要 proot / glibc-runner。实测：

```bash
./package/bin/pagefind_extended --version
# pagefind 1.5.2

./package/bin/pagefind_extended --site dist
# Indexed 21 pages
```

因此只需要解决两件事：

1. 让 pnpm 在 Android 上安装 `@pagefind/linux-arm64`；
2. 让 Pagefind wrapper 在 Android 上查找 `linux-arm64`，而不是 `android-arm64`。

### 修复 A：让 pnpm 安装 linux-arm64 可选包

在 `pnpm-workspace.yaml` 中增加：

```yaml
supportedArchitectures:
  os:
    - current
    - linux
  cpu:
    - current
  libc:
    - current
```

这样 pnpm 会把 `os: ["linux"]`、`cpu: ["arm64"]` 的可选包也链接进来。Android arm64 上会安装：

```text
node_modules/.pnpm/@pagefind+linux-arm64@1.5.2/
```

副作用：pnpm 11.0.9 会顺带安装其他包的 linux-arm64 gnu/musl 变体（sharp、rolldown、biome、lightningcss、oxc 等），`node_modules` 约 680MB。这属于安装体积问题，不影响 Android 上实际加载的包。

### 修复 B：让 Pagefind 识别 Android

```bash
pnpm patch pagefind@1.5.2
```

编辑 `node_modules/.pnpm_patches/pagefind@1.5.2/lib/resolveBinary.js`：

```diff
-const platform = process.platform === "win32" ? "windows" : process.platform;
+const platform =
+  process.platform === "win32"
+    ? "windows"
+    : process.platform === "android"
+      ? "linux"
+      : process.platform;
```

提交：

```bash
pnpm patch-commit node_modules/.pnpm_patches/pagefind@1.5.2
```

生成：

```text
patches/pagefind@1.5.2.patch
```

这个映射在非 Android 平台上不会改变行为。

### 注意事项

同样不要用 `pnpm install --force`。之前实测它会安装所有平台的 optionalDependencies（Windows、macOS、Linux x64/mips 等），直接把磁盘写满。

补丁没生效时：

```bash
rm -rf node_modules
pnpm install --frozen-lockfile
```

验证：

```bash
./node_modules/.bin/pagefind --version
# pagefind 1.5.2

./node_modules/.bin/pagefind --site dist
# Indexed 21 pages
```

---

## 3. 最终验证

```bash
pnpm build
```

实际结果：

```text
astro check: 0 errors / 0 warnings
astro build: 48 page(s) built
pagefind:    Indexed 21 pages
```

```bash
pnpm test
```

实际结果：

```text
tests 13
pass 13
fail 0

build assertions passed: 21 indexed pages, 20 default RSS items
```

```bash
pnpm lint
# Checked 79 files. No fixes applied.
```

`pnpm dev --host 127.0.0.1` 和 `pnpm preview --host 127.0.0.1` 均返回 HTTP 200。Astro 7 的 dev/preview 会在后台运行，停止方式如下：

```bash
pnpm exec astro dev stop
pnpm exec astro preview stop
```