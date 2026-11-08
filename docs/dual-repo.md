# 双仓库：主题与内容分离

Daybook 默认把示例内容放在主题仓库的 `src/content/`，适合只想跑起来看看、或者内容不多的站点。如果希望**主题代码与写作内容各自独立提交**，可以把内容放进一个单独的 Git 仓库，主题通过 `CONTENT_REPO` 指向它。

这不是 Git submodule：内容仓库是一个嵌套在主题目录里的独立仓库，主题仓库的 `.gitignore` 会忽略它。

## 两种模式

| 模式 | 触发方式 | 内容根 | publicDir | 站点配置 |
| --- | --- | --- | --- | --- |
| 主题模式（默认） | `pnpm dev` / `pnpm build` | `src/content/` | `public/` | `src/config/site.ts`、`src/config/links.ts` |
| 内容模式 | `pnpm dev:content` / `pnpm build:content` | `CONTENT_REPO` 指向的目录，默认 `content/` | `<内容根>/public/` | `<内容根>/config/site.ts`、`<内容根>/config/links.ts` |

两种模式共用同一套路由、组件、frontmatter schema 与配置校验；区别是内容目录、publicDir 和站点配置从哪里加载。内容模式不读取主题的 `public/`，两套静态资源互不影响。

```bash
pnpm dev              # 主题模式，读 src/content/
pnpm dev:content      # 内容模式，读 content/
pnpm build            # 主题模式构建
pnpm build:content    # 内容模式构建，并生成 Pagefind 索引
```

## 内容仓库结构

默认目录名为 `content/`，也可以由 `CONTENT_REPO_DIR` 改成别的名字：

```text
content/
├── post/       文章（Markdown / MDX）
├── daily/      日记
├── pages/      独立页面
├── spec/       关于页正文（about.mdx）
├── public/     静态资源（favicon、头像、图片、OG 图等）
├── cache/      Meting-API 构建缓存（可用于加速 Vercel 部署等）
└── config/
    ├── site.ts 站点配置
    └── links.ts 友链配置
```

四个内容目录与主题模式下的 `src/content/{post,daily,pages,spec}` 结构完全相同，frontmatter 规则见 [`content.md`](./content.md)。`config/` 只放配置，不参与内容集合。

`cache/meting-api-data.json` 是 Meting 构建缓存，由 `pnpm build:content` / `pnpm dev:content` 自动生成。它不属于内容，内容仓库应把 `cache/` 加入自己的 `.gitignore`；主题模式的缓存则在 `.cache/meting-api-data.json`，已被主题仓库忽略。

## 静态资源与 publicDir

内容模式下 Astro 的 `publicDir` 指向 `<内容根>/public`，主题仓库的 `public/` 不参与内容模式的开发与构建。两套资源完全隔离，站内引用仍以 `/` 开头：

```text
<内容根>/public/favicon.svg      → /favicon.svg
<内容根>/public/images/photo.jpg → /images/photo.jpg
```

迁移或升级内容仓库时，把主题 `public/` 里仍然需要的资源复制到 `<内容根>/public/`。示例骨架已包含 `favicon.svg`、`avatar.svg` 与 `og-default.png`，可以直接替换成自己的版本。

OG 图按当前模式生成：

```bash
pnpm og            # 主题模式：写入 public/og-default.png
pnpm og:content    # 内容模式：写入 <内容根>/public/og-default.png
```

`pnpm og:content` 会读取内容仓库的 `config/site.ts`，目录顺序为 `--content-repo`、`CONTENT_REPO_DIR`、最后回退到 `content`。修改站点标题、作者或 `since` 后重新生成，并把图片提交到内容仓库。

## 快速开始

### 1. 准备内容仓库

如果你已经有内容仓库，直接看第 2 步。当前工作区里的 `content/` 只是示例骨架；要把它变成真正的内容仓库：

```bash
cd content
git init
git add .
git commit -m "init content"
git remote add origin <你的内容仓库地址>
git push -u origin main
```

然后回到主题目录。若要克隆一个已经有内容远端仓库：

```bash
# content/ 需要不存在或为空；示例骨架会挡住 clone
pnpm content:clone
```

`content:clone` 不会自动 `git init`，也不会提交或推送。目标目录非空且不是 Git 仓库时会直接报错；已有 Git 仓库时会提示已存在并跳过。

### 2. 配置 `.env`

在主题仓库根目录从 `.env.example` 复制 `.env`，填写：

```dotenv
# HTTP(S)：token 可以直接内联在 URL 里
CONTENT_REPO_URL=https://oauth2:YOUR_TOKEN@example.com/you/daybook-content.git

# 或者 SSH：私钥路径必填
# CONTENT_REPO_URL=git@example.com:you/daybook-content.git
# CONTENT_REPO_SSH_KEY=~/.ssh/id_ed25519

CONTENT_REPO_DIR=content
# 可选；不填时使用远端默认分支
CONTENT_REPO_BRANCH=main
```

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `CONTENT_REPO_URL` | `content:clone` / `content:pull` 必填 | http(s) 或 ssh 地址；HTTP token 可内联在 URL 中 |
| `CONTENT_REPO_DIR` | 否 | 内容仓库目录，默认 `content`；相对主题仓库根目录 |
| `CONTENT_REPO_BRANCH` | 否 | 克隆与拉取的分支；不填时用远端默认分支 |
| `CONTENT_REPO_SSH_KEY` | SSH 地址必填 | 私钥文件路径，支持 `~`；脚本用 `GIT_SSH_COMMAND` 指定它 |

`.env` 不要提交。克隆、拉取失败时脚本会脱敏 URL 中的账号、token 与常见 query 参数；但不要把带密钥的完整命令贴到公开 issue。

`content:clone` / `content:pull` 以非交互方式运行 Git：脚本会禁用 credential helper 并设置 `GIT_TERMINAL_PROMPT=0`，不会弹出账号密码输入。因此 HTTP(S) 远端要么是公开仓库，要么把 token 内联在 URL 里；SSH 远端必须提供 `CONTENT_REPO_SSH_KEY`。凭据缺失时会立即失败，而不是挂起等待输入。

### 3. 运行内容模式

```bash
pnpm content:clone    # 首次
pnpm dev:content      # 开发服务器
pnpm check:content    # 类型与内容 schema
pnpm build:content    # 静态构建 + Pagefind
pnpm preview:content  # 预览 dist/
```

修改内容后更新：

```bash
pnpm content:pull     # git pull --ff-only
```

`content:pull` 不会自动 commit、merge 或 stash；只做快进拉取。远端历史与本地分叉时会失败并保留现场，按常规 Git 流程处理后再拉取。

## 内容仓库配置

`content/config/site.ts` 默认导出普通对象，并通过 `import type` 复用主题的**输入类型**；运行时没有主题依赖：

```ts
import type { SiteConfigInput } from '../../src/types/config';

const siteConfig = {
  title: '我的日记',
  url: 'https://example.com',
  author: 'me',
} satisfies SiteConfigInput;

export default siteConfig;
```

`SiteConfigInput` 是 `src/types/config.ts` 里的「用户输入类型」，字段大多可省略；`satisfies` 会检查字段拼写和类型，同时保留字面量。不要改用解析后的 `SiteConfig`，它包含默认值补全后的必填字段。

主题会用 `src/config/define.ts` 的 `defineSiteConfig()` 校验并补全默认值，因此只写需要覆盖的字段即可。字段全集见 [`configuration.md`](./configuration.md)。

`content/config/links.ts` 同理：

```ts
import type { LinksConfigInput } from '../../src/types/config';

const linksConfig = {
  groups: [],
} satisfies LinksConfigInput;

export default linksConfig;
```

类型只参与 TypeScript 检查，`tsx` 读取配置时会擦除，所以内容仓库不需要安装主题依赖。默认的 `content/config` 用 `../../src` 指向主题根；内容仓库单独 clone 到主题目录之外时，运行时仍可加载，但编辑器 / `tsc` 会找不到这个相对路径（TS2307），需要把类型抽成共享包，或临时把内容仓库放在主题目录内做类型检查。

类型检查方式：

- 根 `tsconfig.json` 已 include `content/config/**/*.ts`，内容仓库在主题目录内时 `pnpm check` 会一起检查。
- `content/tsconfig.json` 供内容仓库单独执行 `pnpm exec tsc -p content/tsconfig.json --noEmit`。该命令在主题目录内运行时，内容仓库需位于默认的 `content/`。

配置读取流程：

1. `scripts/site-context.ts` 在构建配置阶段解析 `CONTENT_REPO`；
2. 内容模式下用 Node + tsx 读取内容仓库的两个 TS 配置文件，输出 JSON；
3. 主题用同一套 Zod schema 与语义校验，错误路径显示为 `content/config/site.ts` 或 `content/config/links.ts`；
4. 通过一个只作用于主题 `src/config/site.ts` / `links.ts` 的 Vite 插件注入解析后的配置，页面代码无需改动。
5. 内容配置同时加入 Astro dev 的 watchFiles；开发时修改配置会触发自动重启并重新读取。

因此内容仓库的配置会经过与主题配置完全相同的校验，不需要在内容仓库安装依赖，也不需要复制一份 Zod schema。

## 命令行参数

内容模式除了使用 package scripts，也可以显式指定目录：

```bash
pnpm dev:content --content-repo=../daybook-content
pnpm dev:content --content-repo ../daybook-content
```

- `--content`：进入内容模式，目录取 `--content-repo` 的值、`CONTENT_REPO_DIR`，最后回退到 `content`。
- `--content-repo=DIR` / `--content-repo DIR`：指定内容目录，通常会同时进入内容模式。
- `--theme` / `--no-content`：回到主题模式。
- `--` 后面的参数原样交给 Astro。

这些参数由 `scripts/astro.mjs` 包装器转换成 `CONTENT_REPO` 环境变量后再启动 Astro。所有 package scripts（`dev` / `build` / `preview` / `check` 及其 `:content` 变体）都经过这个包装器；直接运行 `astro dev` 不会解析这些自定义参数，也不会自动处理下面的内容缓存切换。

## 路径与模式限制

- 内容根必须与主题仓库在**同一盘符**：Astro 的 glob base 需要能表示为相对项目根的路径，跨盘符路径会报错；`<内容根>/public` 也受同一限制。
- 内容根不能是主题仓库根目录本身。
- 内容模式下必须存在 `config/site.ts` 与 `config/links.ts`；缺失时构建配置阶段就会失败并给出路径。
- 内容模式默认读取 `<内容根>/{post,daily,pages,spec}`；这些目录可以暂时为空，但建议与骨架保持一致。
- 内容模式只使用 `<内容根>/public` 作为 `publicDir`，主题 `public/` 的资源不会复制进 `dist/`；需要时自行复制到内容仓库。
- 内容模式下 `src/content/` 不参与构建；主题模式也完全不会读取 `content/`。两套内容不要同时修改。
- 内容仓库不是 submodule，主题的 `pnpm install` 不会安装内容仓库，也不需要在内容仓库里安装依赖。

## 开发时的更新

- Markdown / MDX：Astro content layer 监听 `<内容根>/{post,daily,pages,spec}`，保存后增量重载，不需要重启。
- `config/site.ts` / `config/links.ts`：这两个文件被加入 Astro dev 的 watchFiles；修改后开发服务器会自动打印 `Configuration file updated. Restarting...`，重新加载配置并恢复浏览器连接，不需要手动重启。
- 在 dev 运行时执行 `content:pull`：普通的文件写入和重命名会被 watcher 捕获；配置变化会触发上述自动重启。

如果终端没有出现 reload / restart 日志，通常是保存方式没有触发文件事件，再保存一次即可。

## 缓存

内容模式构建使用独立的 `node_modules/.astro-content`，避免和主题构建共用内容层缓存。

Astro 的 content layer 在 dev / check 下始终读写 `.astro/`，`cacheDir` 只隔离 build。如果主题与内容仓库共用这份缓存，集合基址不同会让两边的条目混在一起，典型症状是：

```text
[glob-loader] specCollection contains multiple entries with the same slug: about
```

包装器会在 `.astro/daybook-content-mode` 记录上次的内容来源（主题，或某个具体内容仓库路径）。切换来源时，它会自动删除 `.astro/data-store.json`、`.astro/content-modules.mjs` 与 `.astro/content-assets.mjs`，再启动 Astro，所以正常切换模式不需要手动清缓存。

如果从旧版本升级后仍遇到重复 slug，或缓存被外部工具改坏，可以手动清理后重启：

```bash
rm -rf .astro node_modules/.astro-content
```

这些目录都是构建产物，不在 Git 中。

Meting-API 的响应缓存与 Astro 内容缓存相互独立：主题模式在 `.cache/meting-api-data.json`，内容模式在 `<内容根>/cache/meting-api-data.json`。TTL 与开关由 `siteConfig.mdx.meting.cache` 控制，详见 [`meting.md`](./meting.md#服务端缓存)。

## 迁移现有内容

1. 先在主题仓库外创建内容仓库（或复制当前 `content/` 骨架）；
2. 把 `src/content/{post,daily,pages,spec}` 里的文件按同名目录移动到内容仓库；
3. 把主题 `public/` 里站内仍在引用的资源复制到 `<内容根>/public/`（至少 favicon、头像与 OG 图）；
4. 把 `src/config/site.ts` 与 `links.ts` 的**实际配置值**写成 `content/config/site.ts` / `links.ts` 的默认导出对象（不要复制 `defineSiteConfig(...)` 调用）；
5. 在主题 `.env` 填写 `CONTENT_REPO_URL`，用 `pnpm content:clone` 拉取（或直接把目录放到 `content/`）；
6. 运行 `pnpm og:content` 生成内容仓库的 `public/og-default.png`；
7. 运行 `pnpm check:content` 与 `pnpm build:content`，逐页核对首页、文章、独立页面、关于页、RSS、搜索与静态资源；
8. 确认无误后再考虑删除 `src/content/` 里的示例内容。主题模式与内容模式是两套独立内容，删除前先确认部署仍使用 `build:content`。

## 限制

- 内容仓库的 `config/*.ts` 由 Node 子进程读取，适合放纯 TS 配置对象；不承诺在其中 import 主题运行时组件。
- 内容 MDX 可以写标准 Markdown/MDX，但主题没有为内容仓库提供稳定的组件导入 API；需要导入主题组件时请自行评估路径与构建边界。
- 主题的 `tests/build/assert-dist.ts` 只断言主题示例内容；内容模式的页面需要手动冒烟，或另写一份针对自己内容仓库的断言。
- 内容仓库的 Git 历史与主题仓库完全独立；主题不会自动提交内容变更。

## 验证清单

- `pnpm test:unit`：路径解析与 Git 辅助函数的单元测试。
- `pnpm lint`、`pnpm check`、`pnpm build`、`pnpm test`：主题模式必须全绿。
- `pnpm check:content`、`pnpm build:content`：内容模式必须能读到内容仓库配置与示例内容，`dist/` 中出现 `daily/...`、`post/...`、`pages` 对应的路由，以及内容仓库 `public/` 里的 `favicon.svg`、`avatar.svg`、`og-default.png`。
- `pnpm og:content`：确认输出到 `<内容根>/public/og-default.png`，且主题 `public/og-default.png` 不被修改。
- 用临时远端仓库验证 `content:clone` 与 `content:pull`；确认失败日志不包含 token/私钥。
- 启动 `pnpm dev:content`，在浏览器检查首页、文章列表、独立页面、关于页、静态资源与搜索索引。
