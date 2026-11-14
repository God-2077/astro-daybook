# 双仓库：主题与内容分离

Daybook 默认把内容放在主题仓库的 `src/content/`。这页解释另一种组织方式：把写作内容与站点配置放进独立的 Git 仓库（内容仓库），主题通过 `CONTENT_REPO` 指向它；并带你完成第一次配置、日常更新，以及从主题模式迁移。

需要先有：已按[快速开始](./quick-start.md)跑通主题模式；会基本的 Git 操作（clone、commit、push）；一个可用的内容仓库远端，或准备新建一个。

## 什么时候用双仓库

适合这些情况：

- 想让写作提交与主题升级互不干扰：主题仓库只放代码与文档，内容仓库只有内容。
- 想给内容单独配权限，或把内容仓库设成私有、主题仓库保持公开。
- 多台设备或多个人写内容，内容仓库可以单独 clone 与 pull。
- 想从官方内容仓库 <https://github.com/God-2077/astro-daybook-content/> 起步。

这些情况不需要双仓库：

- 只有一个站点，不介意写作提交与主题提交在同一个仓库：用默认的主题模式，内容放 `src/content/`。
- 只是试用主题：主题模式少一个 clone 步骤。

代价：

- 每次写作前后多一个 `pnpm content:pull` 与 push 的动作。
- 构建、预览与检查要用 `:content` 脚本，不能再用 `pnpm build` 得到内容站点。
- 内容根必须与主题仓库在同一盘符（见[路径与模式限制](#路径与模式限制)）。
- 站点配置移到了内容仓库，主题仓库的 `src/config/site.ts` 在内容模式下不再生效。
- 部署时构建机要能访问内容仓库（见[部署指南](./deployment.md)）。

## 两种模式

| 模式 | 触发方式 | 内容根 | publicDir | 站点配置 |
| --- | --- | --- | --- | --- |
| 主题模式（默认） | `pnpm dev` / `pnpm build` | `src/content/` | `public/` | `src/config/site.ts`、`src/config/links.ts` |
| 内容模式 | `pnpm dev:content` / `pnpm build:content` | `CONTENT_REPO` 指向的目录，默认 `content/` | `<内容根>/public/` | `<内容根>/config/site.ts`、`<内容根>/config/links.ts` |

两种模式共用同一套路由、组件、frontmatter schema 与配置校验；区别只有内容根、`publicDir` 与站点配置从哪里加载。内容模式不读取主题的 `src/content/` 与 `public/`，主题模式也不读取 `content/`，两套内容不要同时修改。

```bash
pnpm dev              # 主题模式：内容读 src/content/，配置读 src/config/
pnpm build            # 主题模式构建，postbuild 生成 Pagefind 索引
pnpm dev:content      # 内容模式：内容读内容根，配置读 <内容根>/config/
pnpm build:content    # 内容模式构建，末尾生成 Pagefind 索引
```

`content/` 不是 Git submodule：它只是被主题仓库 `.gitignore` 忽略的目录，里面可以是独立的 Git 仓库。

## 内容仓库结构

```text
content/                                默认目录名，可用 CONTENT_REPO_DIR 改
├─ post/                                文章（Markdown / MDX）
├─ daily/                               日记
├─ pages/                               独立页面
├─ spec/                                关于页正文（about.mdx）
├─ public/                              静态资源（favicon、头像、图片、OG 图等）
├─ cache/                               Meting 构建缓存，首次写入时自动创建，不属于内容
├─ config/
│  ├─ site.ts                           站点配置
│  └─ links.ts                          友链配置
├─ tsconfig.json                        内容仓库单独做类型检查用
└─ .github/workflows/deploy-vercel.yml  可选：推送内容后触发 Vercel 重建
```

- 四个集合目录与主题模式的 `src/content/{post,daily,pages,spec}` 结构相同，frontmatter 规则见[写作指引](./writing.md)。
- `post/`、`daily/`、`pages/` 可以为空；`spec/about.mdx` 必须存在（关于页正文），缺失时构建失败并给出路径。
- `public/` 是内容模式的 `publicDir`，站内仍用 `/` 开头的路径引用：`<内容根>/public/images/photo.jpg` 对应 `/images/photo.jpg`。
- `config/` 只放站点配置，不参与内容集合。
- `cache/meting-api-data.json` 是 Meting API 的构建缓存，不属于内容；内容仓库应把 `cache/` 加进自己的 `.gitignore`。
- `.github/workflows/deploy-vercel.yml` 是可选的部署 workflow，作用见[部署到 Vercel](./deployment-vercel.md)；本地开发不需要它。

## 第一次配置

**1. 准备内容仓库**

- 已经有远端内容仓库：在主题仓库里直接 clone，目标目录必须不存在或为空。
- 没有内容仓库：从官方内容仓库 <https://github.com/God-2077/astro-daybook-content/> 起步，或新建一个仓库，把 `daily/`、`post/`、`pages/`、`spec/`、`public/`、`config/` 放进去。
- 不打算用 clone：手动把内容仓库目录放到主题仓库的 `content/`（或 `CONTENT_REPO_DIR` 指定的位置）也可以。

**2. 配置 `.env`**

在主题仓库根目录从 `.env.example` 复制一份 `.env`，填写：

```dotenv
# HTTP(S)：token 可以内联在 URL 里
CONTENT_REPO_URL=https://oauth2:YOUR_TOKEN@example.com/you/daybook-content.git

# 或者 SSH：私钥路径必填
# CONTENT_REPO_URL=git@example.com:you/daybook-content.git
# CONTENT_REPO_SSH_KEY=~/.ssh/id_ed25519

CONTENT_REPO_DIR=content
CONTENT_REPO_BRANCH=main
```

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `CONTENT_REPO_URL` | `content:clone` / `content:pull` 必填 | http(s) 或 ssh 地址；HTTP(S) 可以把 token 内联在 URL 里 |
| `CONTENT_REPO_DIR` | 否 | 内容仓库目录，默认 `content`；相对主题仓库根目录 |
| `CONTENT_REPO_BRANCH` | 否 | 克隆与拉取的分支；不填时使用远端默认分支 |
| `CONTENT_REPO_SSH_KEY` | SSH 地址必填 | 私钥文件路径，支持 `~`；脚本通过 `GIT_SSH_COMMAND` 指定它 |

`.env` 不要提交：`.gitignore` 忽略 `.env` 与 `.env.*`，只保留 `.env.example`。

`content:clone` / `content:pull` 以非交互方式运行 Git：禁用 credential helper、设置 `GIT_TERMINAL_PROMPT=0`、SSH 使用 `BatchMode=yes`。因此 HTTP(S) 远端要么公开，要么把 token 内联在 URL 里；SSH 远端必须提供 `CONTENT_REPO_SSH_KEY`。凭据缺失时会立即失败，不会挂起等待输入。

**3. 克隆内容仓库**

```bash
pnpm content:clone
```

预期输出：

```text
[daybook:content] 正在克隆内容仓库到 content …
[daybook:content] 内容仓库已就绪。开发：pnpm dev:content；构建：pnpm build:content。
```

`content:clone` 按目标目录的状态分四种情况：

| 目标目录 | 行为 |
| --- | --- |
| 不存在 | 创建父目录后 clone |
| 存在且为空 | clone |
| 存在且已是 Git 仓库 | 打印「内容仓库已存在：content，跳过克隆。」并直接跳过，不校验远端、不 pull |
| 存在、非空、不是 Git 仓库 | 报错并提示换 `CONTENT_REPO_DIR` 或清理目录 |

**4. 补内容仓库配置**

内容模式要求内容仓库里存在 `config/site.ts` 与 `config/links.ts`，缺失时构建在配置阶段失败。写法见[内容仓库配置](#内容仓库配置)。

**5. 验证**

```bash
pnpm dev:content
```

预期：终端打印 `[daybook] 内容仓库模式：content`；打开开发服务器地址（默认 `http://localhost:4321`）后看到的是内容仓库里的内容，而不是 `src/content/` 里的示例。

## 日常写作与更新

写内容本身在内容仓库里进行；下面的命令都在主题仓库根目录执行：

```bash
pnpm content:pull     # 拉取内容仓库更新（git pull --ff-only）
pnpm check:content    # 类型、模板与内容 schema
pnpm build:content    # 静态构建，末尾生成 Pagefind 索引
pnpm preview:content  # 本地预览 dist/
pnpm og:content       # 按内容仓库配置重新生成 public/og-default.png
```

- 写内容：直接改内容仓库的 `post/`、`daily/`、`pages/`、`spec/`。`pnpm dev:content` 运行期间保存文件会自动重载，不需要重启。
- 改配置：`<内容根>/config/site.ts` 与 `links.ts` 修改后，开发服务器会自动重启并重新读取配置，不需要手动停止再启动。
- `pnpm content:pull` 只做 `git pull --ff-only`，不会自动 commit、merge 或 stash；远端与本地分叉时会失败并保留现场。
- 提交与推送由你自己在内容仓库里做，主题仓库不会自动提交内容。
- 部署见[部署指南](./deployment.md)；Vercel 自动发布见[部署到 Vercel](./deployment-vercel.md)。

## 内容仓库配置

内容模式下，站点配置与友链配置来自内容仓库，主题仓库的 `src/config/site.ts` 不再生效。两个文件都必须存在：

- `config/site.ts`：站点配置。
- `config/links.ts`：友链配置。

用 `import type` 复用主题的输入类型，用 `satisfies` 检查字段拼写与类型，默认导出配置对象：

```ts
// content/config/site.ts
import type { SiteConfigInput } from '../../src/types/config';

const siteConfig = {
  title: '我的日记',
  url: 'https://example.com',
  author: 'me',
} satisfies SiteConfigInput;

export default siteConfig;
```

```ts
// content/config/links.ts
import type { LinksConfigInput } from '../../src/types/config';

const linksConfig = {
  groups: [],
} satisfies LinksConfigInput;

export default linksConfig;
```

规则：

- 只写需要覆盖的字段即可：主题用同一套 Zod schema 做结构校验、补全默认值并做语义校验；字段全集见[配置说明](./configuration.md)。
- 默认导出配置对象；也接受导出名为 `siteConfig` / `linksConfig` 的对象。
- 用输入类型 `SiteConfigInput` / `LinksConfigInput`，不要用补全默认值后的 `SiteConfig` / `LinksConfig`。
- `config/links.ts` 的 `groups` 必填，可以是空数组。
- 示例里的 `../../src/types/config` 假设内容仓库位于主题仓库的 `content/`。内容仓库在别处时运行时仍可读取（`import type` 会被擦除），但编辑器与 `tsc` 找不到这个类型；需要独立类型检查时，把类型抽成共享包。
- 字段写错时构建失败，错误路径显示为 `content/config/site.ts` 或 `content/config/links.ts`（随实际目录变化）。
- 内容仓库不需要安装主题依赖。

类型检查：

- 内容仓库位于默认的 `content/` 时，主题根目录的 `pnpm check` 会一起检查 `content/config/**/*.ts`（根 `tsconfig.json` 的 `include`）。
- 内容仓库自带 `tsconfig.json`，也可以在主题目录内单独运行 `pnpm exec tsc -p content/tsconfig.json --noEmit`。

## 静态资源与 OG 图

内容模式使用 `<内容根>/public` 作为 `publicDir`，主题仓库的 `public/` 不参与内容模式的开发与构建。两套资源完全隔离，站内引用仍以 `/` 开头：

```text
<内容根>/public/favicon.svg       → /favicon.svg
<内容根>/public/images/photo.jpg  → /images/photo.jpg
```

从主题模式迁移或升级内容仓库时，把主题 `public/` 里仍然需要的资源复制到 `<内容根>/public/`。官方内容仓库示例已经包含 `favicon.svg`、`avatar.svg` 与 `og-default.png`，可以直接替换成自己的版本。

OG 图按当前模式生成：

```bash
pnpm og            # 主题模式：写入 public/og-default.png
pnpm og:content    # 内容模式：写入 <内容根>/public/og-default.png
```

- `pnpm og:content` 读取内容仓库 `config/site.ts` 的 `title`、`subtitle`、`author`、`since` 生成图片；改这些字段后重新生成，并把图片提交到内容仓库。
- 内容目录优先顺序：`--content-repo` > `CONTENT_REPO_DIR` > `content`。
- `pnpm og:content` 只写内容仓库的 `public/og-default.png`，不改主题仓库的 `public/og-default.png`。

## 命令行参数

除了使用 `:content` 脚本，也可以显式指定内容目录：

```bash
pnpm dev:content --content-repo=../daybook-content
pnpm dev:content --content-repo ../daybook-content
```

| 参数 | 作用 |
| --- | --- |
| `--content` | 进入内容模式；目录取 `--content-repo`，其次 `CONTENT_REPO_DIR`，最后回退到 `content` |
| `--content=DIR` | 进入内容模式并指定目录 |
| `--content-repo DIR` / `--content-repo=DIR` | 指定内容目录，同时进入内容模式 |
| `--theme` / `--no-content` | 回到主题模式，并清除环境里的 `CONTENT_REPO` |
| `--` | 后面的参数原样交给 Astro |

说明：

- 这些参数由 `scripts/astro.mjs` 包装器转换成 `CONTENT_REPO` 环境变量后再启动 Astro。`pnpm dev`、`build`、`preview`、`check` 及其 `:content` 变体都经过这个包装器；直接运行 `astro dev` 不会解析这些参数。
- 不带模式参数的命令会保留调用方环境里的 `CONTENT_REPO`，包括 `.env` 与 shell 变量。显式回到主题模式请加 `--theme`。
- `CONTENT_REPO` 的停用值：空字符串、`0`、`false`、`off`、`no`（大小写不敏感），命中任一个都使用主题模式。
- 构建时用 `CONTENT_REPO_DIR` 指定内容目录更稳妥：`build:content` 脚本由 `&&` 连接 Astro 构建与 `pagefind` 两步。

## 路径与模式限制

- 内容根必须与主题仓库在同一盘符：Astro 的 glob base 必须是相对项目根的路径，跨盘符会报错 `内容仓库必须与主题仓库在同一盘符：<路径>`。
- 内容根不能等于主题仓库根目录，否则报错 `内容仓库不能是主题仓库根目录；请把 CONTENT_REPO 指向一个子目录或独立的内容目录。`
- 内容模式必须存在 `config/site.ts` 与 `config/links.ts`，缺失时构建在配置阶段失败并提示路径。
- `spec/about.mdx` 必须存在，缺失时报 `[daybook:content] <内容根>/spec/about.mdx`，并提示新建该文件。
- 内容模式只读取 `<内容根>/{post,daily,pages,spec}` 与 `<内容根>/public`；`src/content/` 与主题 `public/` 不参与构建。
- 内容仓库不是 submodule：主题仓库的 `pnpm install` 不会安装内容仓库，内容仓库也不需要安装依赖。
- 主题仓库的 `.gitignore` 对内容目录只忽略了根目录的 `/content/`。用别的名字做 `CONTENT_REPO_DIR` 并放在主题仓库内部时，它不会被忽略，记得自己加进 `.gitignore`，否则内容会被主题仓库的 `git status` 当成新文件。
- 主题模式的 Meting 缓存在 `.cache/meting-api-data.json`。`.gitignore` 在 `.cache/*` 之后又写了 `!.cache/meting-api-data.json`，所以这个文件实际没有被忽略，不要提交它。内容模式的缓存在 `<内容根>/cache/meting-api-data.json`，内容仓库应把 `cache/` 加进 `.gitignore`。

## 迁移现有内容

1. 在主题仓库外创建内容仓库，或复制官方内容仓库作为起点。
2. 把 `src/content/{post,daily,pages,spec}` 里的文件按同名目录移动到内容仓库。
3. 把主题 `public/` 里站内仍在引用的资源复制到 `<内容根>/public/`（至少 favicon、头像与 OG 图）。
4. 把 `src/config/site.ts` 与 `src/config/links.ts` 里的实际配置值改写成内容仓库的 `config/site.ts` 与 `config/links.ts`：写普通对象加 `satisfies` 输入类型，不要复制 `defineSiteConfig(...)` / `defineLinksConfig(...)` 调用。
5. 在主题仓库 `.env` 填 `CONTENT_REPO_URL`，用 `pnpm content:clone` 拉取，或直接把目录放到 `content/`。
6. 运行 `pnpm og:content` 生成内容仓库的 `public/og-default.png`。
7. 运行 `pnpm check:content` 与 `pnpm build:content`，逐页核对首页、文章、独立页面、关于页、RSS、搜索与静态资源。
8. 确认无误后再删除 `src/content/` 里的示例内容。主题模式与内容模式是两套独立内容，删除前先确认部署仍使用 `build:content`（见[部署指南](./deployment.md)）。

## 排错

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `内容仓库缺少 config/site.ts：<路径>` | `CONTENT_REPO` / `CONTENT_REPO_DIR` 没有指向内容仓库根目录，或内容仓库还没建 `config/` | 检查 `.env` 与 `--content-repo`；在内容仓库根创建 `config/site.ts` 与 `config/links.ts` |
| `内容仓库必须与主题仓库在同一盘符：<路径>` | 内容目录在另一个盘符 | 把内容仓库放到与主题仓库同盘符的位置 |
| `内容仓库不能是主题仓库根目录；……` | `CONTENT_REPO` 指向了 `.` | 指向子目录或独立的内容目录 |
| `目标目录非空且不是 Git 仓库：content；……` | `content/` 里有文件但不是 Git 仓库（例如手动放进去的内容） | 清空该目录、换 `CONTENT_REPO_DIR`，或把目录改为 Git 仓库 |
| `内容仓库已存在：content，跳过克隆。` | 目标目录已经是 Git 仓库，`content:clone` 不会更新它 | 这是正常提示；更新内容用 `pnpm content:pull` |
| `缺少 CONTENT_REPO_URL；……` | `.env` 没有配置克隆地址 | 按「第一次配置」填写 `CONTENT_REPO_URL` |
| `SSH 地址需要配置 CONTENT_REPO_SSH_KEY；……` | 用了 SSH 地址但没有给私钥路径 | 填写 `CONTENT_REPO_SSH_KEY`，或改用带 token 的 HTTPS 地址 |
| `内容仓库不存在：content。请先运行 pnpm content:clone。` | 对非 Git 仓库目录执行了 `content:pull` | 先 `pnpm content:clone`，或确认内容目录是 Git 仓库 |
| `[glob-loader] specCollection contains multiple entries with the same slug: about` | 切换过模式或内容来源后，Astro 内容层缓存里混进了两套内容 | 删除 `.astro/` 与 `node_modules/.astro-content/` 后重启 |
| `pnpm dev` 没有进入内容模式 | 环境里的 `CONTENT_REPO` 为空或为停用值，或者用的是主题模式命令 | 用 `pnpm dev:content`，或在命令前设置 `CONTENT_REPO` |
| clone / pull 失败，日志里的地址被打码 | 脚本会脱敏失败日志中的账号、token 与常见 query 参数 | 这是预期行为；不要把完整命令贴进公开 issue |

更多构建与配置问题见[排错](./troubleshooting.md)。

## 限制

- 内容仓库的 `config/*.ts` 由 Node 子进程读取，适合放纯 TS 配置对象；不承诺在其中 import 主题运行时组件。
- 内容 MDX 可以写标准 Markdown / MDX，但主题没有为内容仓库提供稳定的组件导入 API；需要导入主题组件时自行评估路径与构建边界。
- 主题的 `tests/build/assert-dist.ts` 只断言主题示例内容；内容模式的页面需要手动冒烟，或另写一份针对自己内容仓库的断言。
- 内容仓库的 Git 历史与主题仓库完全独立，主题不会自动提交内容变更。
- 内容模式的构建依赖本地内容仓库，不并入默认的 `pnpm test`。
- 配置注入、缓存标记与路径 helper 等实现细节见[实现取舍](./developers/reference.md)。

## 验证清单

- [ ] `pnpm test:unit` 通过（包含内容路径与 Git 辅助函数的单元测试）。
- [ ] `pnpm content:clone` 成功；目标目录已是 Git 仓库时打印跳过并以 0 退出。
- [ ] `pnpm check:content` 通过。
- [ ] `pnpm build:content` 生成 `dist/`，包含 `dist/pagefind/`、`dist/feed.xml` 等产物，以及内容仓库 `public/` 里的资源。
- [ ] `pnpm preview:content` 打开后，首页、文章、独立页面、关于页与搜索都正常。
- [ ] `pnpm og:content` 写入 `<内容根>/public/og-default.png`，主题 `public/og-default.png` 没有被改动。
- [ ] 用一个临时远端仓库验证 `content:clone` 与 `content:pull`，失败日志里没有 token 或私钥。
- [ ] 部署使用 `build:content`（见[部署指南](./deployment.md)）。

相关页面：[快速开始](./quick-start.md)、[写作指引](./writing.md)、[配置说明](./configuration.md)、[部署指南](./deployment.md)、[部署到 Vercel](./deployment-vercel.md)、[排错](./troubleshooting.md)、[文档索引](./README.md)。
