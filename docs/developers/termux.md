# Termux / Android 构建修复

Termux（Android aarch64）上 `pnpm build` 会依次遇到三个 Android 构建问题：Sätteri 没有 Android 原生绑定、Pagefind 没有 `android-arm64` 包、`sharp` 没有 Android 原生包。这页给出症状、一键修复脚本和对应的手工步骤。前置：已在 Termux 里装好 Node 与 pnpm，克隆了本仓库，能在仓库根目录执行命令；首次安装与启动见[快速开始](../quick-start.md)。适用于仓库 `main` 分支当前代码（`package.json` 1.2.1）。

## 这页解决什么（环境表）

| 项目 | 值 |
| --- | --- |
| 平台 | Termux / Android，`aarch64` |
| Node | `>=22.23.4`（`package.json` 的 `engines.node`） |
| pnpm | `>=7.1.0`（`package.json` 的 `engines.pnpm`） |
| Astro | `7.4.2`（`package.json` 的 `dependencies.astro`） |
| Pagefind | `1.5.2`（`package.json` 的 `devDependencies.pagefind`） |

三个问题各自的表现：

| 组件 | 缺什么 | 处理方式 |
| --- | --- | --- |
| Sätteri（`@astrojs/markdown-satteri` 的依赖） | 没有 Android 原生包 | 装 WASI 回退包，并修改它的 preopen 目录 |
| Pagefind | 没有 `android-arm64` 包 | 让 pnpm 装 `@pagefind/linux-arm64`，并让 Pagefind 在 Android 上查找 `linux-arm64` |
| `sharp`（Astro 图片优化） | 没有 Android 原生包 | 装 `@img/sharp-wasm32` wasm 回退 |

## 症状与原因

### Sätteri 加载失败

```text
Cannot find native binding. npm has a bug related to optional dependencies...
cause: Error: Cannot find module '@bruits/satteri-android-arm64'
```

Astro 7.4.2 的配置 schema 在加载阶段 import `@astrojs/markdown-satteri`（见 `node_modules/astro/dist/core/config/schemas/base.js`），而 `satteri` 没有 Android 原生包，只提供桌面平台的原生包与 WASI 回退。

补装 WASI 回退后还会报第二个错：

```text
Error: UVWASI_EACCES, uvwasi_init
```

WASI 初始化时把文件系统根目录作为 preopen，Android 不允许预打开根目录。修复方向是把 preopen 改成当前工作目录。

### Pagefind 没有 Android 构建

Astro 构建完成后，`postbuild` 的 `pagefind --site dist` 失败：

```text
Failed to install either of [pagefind_extended, pagefind].
Most likely the platform android-arm64 is not yet a supported architecture.
```

Pagefind 的可选依赖里只有 darwin、linux、freebsd、windows，没有 `android-arm64`。但 `@pagefind/linux-arm64` 里的 `pagefind_extended` 是静态链接的 aarch64 二进制，可以直接在 Termux 执行。因此要解决两件事：

1. 让 pnpm 额外安装声明了 `os: linux` 的可选依赖（`supportedArchitectures`）。
2. 让 Pagefind 在 Android 上查找 `linux-arm64`，而不是 `android-arm64`（改 `lib/resolveBinary.js` 的平台映射）。

### sharp 失败

`sharp` 没有 Android 原生包。收紧 `supportedArchitectures` 后，构建触到图片优化时会失败；给它补上 wasm 回退 `@img/sharp-wasm32`。

## 一键修复

在仓库根目录执行：

```bash
pnpm fix:termux
```

脚本是幂等的，重复执行只补齐缺失部分。可选参数：

| 参数 | 作用 |
| --- | --- |
| `--dry-run` | 只检查并打印将要做的修改与补丁内容，不写文件、不安装 |
| `--no-install` | 只写配置与补丁，不执行 `pnpm install` |
| `--reinstall` | 先删除 `node_modules` 再安装，补丁没有生效时用 |
| `--build` | 修复完成后执行一次 `pnpm build` |
| `--force` | 不在 Android 上也写入这些配置（补丁本身跨平台安全） |
| `-h` / `--help` | 显示脚本帮助 |

`--reinstall` 与 `--no-install` 不能同时使用。命令行参数要经 pnpm 转发，写成 `pnpm fix:termux -- --dry-run` 这样的形式。

脚本依次做这几件事：

1. 在 `pnpm-workspace.yaml` 写入 `supportedArchitectures`（`os` 保留 `current` 并追加 `linux`）与 `patchedDependencies`。
2. 生成 `patches/` 下的两个补丁：Sätteri WASI 的 preopen 修改与 Pagefind 的平台映射；版本按已安装的包自动取。
3. 把 `@bruits/satteri-wasm32-wasi` 与 `@img/sharp-wasm32` 写进 `devDependencies`，版本与已安装的 `satteri`、`sharp` 一致。
4. 执行 `pnpm install` 应用补丁；安装时显式带 `--config.optimistic-repeat-install=false`。
5. 验证 Sätteri、Pagefind 与 sharp 能加载，缺补丁时直接改写 `node_modules` 兜底并警告。

成功时最后几行类似：

```text
[daybook:termux] satteri OK <数量>
[daybook:termux] pagefind 1.5.2
[daybook:termux] sharp OK <sharp 版本号>
[daybook:termux] Sätteri（WASI 回退）、Pagefind 与 sharp（wasm 回退）均可用。
[daybook:termux] 修复完成。
```

`satteri OK` 后面的数字是 Sätteri 导出的数量，随版本变化，不要求固定值；Pagefind 那一行是 `pagefind --version` 的输出，版本号与 `package.json` 一致。

## 手动修复：Sätteri WASI

不用脚本时按下面的步骤手工补。第 1 步先确定 `satteri` 的已安装版本（`pnpm why satteri` 或 `pnpm-lock.yaml` 里 `satteri@` 后面的版本），下面用 `<satteri 版本>` 代指。

1. 把 WASI 回退包加进开发依赖，版本与 `satteri` 一致：

   ```bash
   pnpm add -D @bruits/satteri-wasm32-wasi@<satteri 版本>
   ```

2. 生成补丁并编辑 preopen。运行 `pnpm patch` 后，pnpm 会打印一个临时目录（形如 `node_modules/.pnpm_patches/<包名>@<版本>`，以它打印的路径为准）：

   ```bash
   pnpm patch @bruits/satteri-wasm32-wasi@<satteri 版本>
   ```

   在 `node_modules/.pnpm_patches/@bruits/satteri-wasm32-wasi@<satteri 版本>/` 下改两个文件。

   `satteri_napi.wasi.cjs`：

   ```diff
   -const __rootDir = __nodePath.parse(process.cwd()).root
   +const __rootDir = process.cwd()
   ```

   `wasi-worker.mjs`：

   ```diff
   -const __rootDir = parse(process.cwd()).root;
   +const __rootDir = process.cwd();
   ```

   两处都是把 preopen 的根目录换成当前工作目录；文件里的路径写法以你实际看到的为准，不要改其它行。

3. 提交补丁，pnpm 会把补丁写到 `patches/` 并登记到 `pnpm-workspace.yaml` 的 `patchedDependencies`：

   ```bash
   pnpm patch-commit node_modules/.pnpm_patches/@bruits/satteri-wasm32-wasi@<satteri 版本>   # 换成 pnpm patch 打印的目录
   ```

4. 安装并应用补丁：

   ```bash
   pnpm install --config.optimistic-repeat-install=false
   ```

## 手动修复：Pagefind

1. 在 `pnpm-workspace.yaml` 里加入 `supportedArchitectures`，已有的 `allowBuilds` 保留：

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

2. 生成 Pagefind 补丁（版本取 `package.json` 的 `devDependencies.pagefind`，当前是 `1.5.2`）：

   ```bash
   pnpm patch pagefind@1.5.2
   ```

   编辑 `node_modules/.pnpm_patches/pagefind@1.5.2/lib/resolveBinary.js`，把平台那一行改成 Android 映射到 `linux`：

   ```diff
   -const platform = process.platform === "win32" ? "windows" : process.platform;
   +const platform =
   +  process.platform === "win32"
   +    ? "windows"
   +    : process.platform === "android"
   +      ? "linux"
   +      : process.platform;
   ```

   同一个文件里的报错文案与其它逻辑不用改。提交补丁：

   ```bash
   pnpm patch-commit node_modules/.pnpm_patches/pagefind@1.5.2   # 换成 pnpm patch 打印的目录
   ```

3. 补装 sharp 的 wasm 回退（版本取 `package.json` 的 `dependencies.sharp`，当前是 `0.35.5`）：

   ```bash
   pnpm add -D @img/sharp-wasm32@0.35.5
   ```

4. 安装：

   ```bash
   pnpm install --config.optimistic-repeat-install=false
   ```

改 `pnpm-workspace.yaml` 后如果安装没有动作，就是 pnpm 的 `optimisticRepeatInstall` 跳过了只改工作区配置的安装，用上面的 `--config.optimistic-repeat-install=false` 再跑一次。

## 验证

1. 构建：

   ```bash
   pnpm build
   ```

   预期：Astro 构建完成，`postbuild` 的 `pagefind --site dist` 成功执行，生成 `dist/pagefind/`。Pagefind 输出的 indexed pages 数量随内容变化，不要求固定值。`pnpm build` 不跑 `astro check`，类型检查要另外执行 `pnpm check`。

2. 跑测试：

   ```bash
   pnpm test
   ```

   预期：单元断言全过，最后一行形如 `build assertions passed: N indexed pages, M default RSS items`。N 与 M 由当前内容与 `tests/build/assert-dist.ts` 的断言决定，不是固定值。

3. 本地预览：

   ```bash
   pnpm preview
   ```

   预期：页面样式、字体与图片正常；搜索面板能返回结果（说明 Pagefind 索引已生成且可读）。

修复过程中如果报错没有覆盖到，先看[排错](../troubleshooting.md)里的终端报错前缀说明。

## 注意事项

- **不要用 `pnpm install --force`**：它会安装所有平台的可选依赖，可能写满磁盘。
- `patches/` 是脚本生成物，仓库默认没有这个目录；`pnpm-workspace.yaml` 初始也只有 `allowBuilds`。运行 `pnpm fix:termux` 之后才会出现 `patches/` 与 `patchedDependencies`。
- pnpm 偶尔不会重新落盘补丁；脚本会直接改写 `node_modules` 里的文件并给出警告。再次出现时用 `pnpm fix:termux -- --reinstall` 彻底重装。
- 升级 Astro、Sätteri、Pagefind 或 sharp 后重新运行脚本：脚本按已安装版本生成补丁，替换规则对不上时会警告「与补丁目标不一致（可能已升级），请更新脚本中的替换规则」。
- `supportedArchitectures` 会让 pnpm 额外安装 `linux` 变体的可选依赖，`node_modules` 体积会变大。
- 脚本默认只在 Android 上运行；在其它平台预写这些配置要加 `--force`，补丁本身跨平台安全。
- `--no-install` 只能在依赖已经安装后使用：`node_modules` 不存在或 WASI 包还没装时脚本会直接报错。
