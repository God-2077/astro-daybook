# AGENTS.md · Daybook（纸页日记）

本文件是本仓库的协作规则，供 AI Agent 与人类贡献者共用。

配套文档：[README.md](./README.md)（安装、写作与配置入口）、[docs/configuration.md](./docs/configuration.md)（配置字段、部署、安全边界）、[docs/content.md](./docs/content.md)（内容目录、frontmatter、可见性）、[docs/dual-repo.md](./docs/dual-repo.md)（主题与内容分仓、clone/pull）。

---

## 1. 项目概述

Daybook 是一个以日记为主、文章为辅的静态博客：构建时生成纯静态 HTML，没有数据库，也没有服务端。

- 读者看到的是**一页可以慢慢读的日记内页**：日期栏、1px 细线、大块留白、淡粉点缀。
- 写作者只需要在 `src/content/` 里写 Markdown / MDX，`pnpm build` 之后把 `dist/` 交给任意静态托管；也可以把内容放到独立仓库，用 `pnpm dev:content` / `pnpm build:content` 构建。
- 站点是**单语言构建**：`siteConfig.lang` 决定这次输出哪种语言，`zh_CN` / `zh_TW` / `en` / `ja` 四种语言各有完整界面文案。

优先级：可读性 > 主题一致性 > 功能完整 > 视觉新鲜感。

## 2. 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Astro 7（`output: 'static'`、`trailingSlash: 'never'`、`prefetch`） |
| 交互岛 | React 19（仅搜索面板与评论区） |
| 语言 | TypeScript 6 + Zod 4（配置与 frontmatter 全量校验） |
| 正文 | Markdown / MDX → remark + rehype；Shiki（github-light / github-dark）、KaTeX |
| 搜索 | Pagefind 1.5，构建后由 `postbuild` 生成索引 |
| 图片 | lightGallery 3（按需加载） |
| 评论 | Twikoo / Waline / Artalk（本地依赖，按 `provider` 懒加载） |
| 工具 | pnpm（唯一包管理器）、Biome 2（lint + format） |

Node >= 22.23.4，pnpm >= 7.1.0。

## 3. 目录结构与职责

```text
src/
├─ pages/        路由，见下方「路由」
├─ layouts/      BaseLayout（html / head / 主题脚本 / 外壳）、PageLayout（content/pages 独立页面外壳）
├─ components/
│  ├─ layout/    Header / Footer / Drawer / BottomNav / Sprite
│  ├─ common/    PageHead / Icon / EmptyState / Pager
│  ├─ content/   DiaryEntry / PostRow / FeedHead / Toc / LockedContent / MusicPlayer
│  ├─ views/     HomeFeed / PostIndex
│  ├─ search/    SearchPanel.tsx（React + Pagefind）
│  └─ comments/  Comments.tsx（provider 路由）+ providers/（Twikoo / Waline / Artalk）
├─ styles/       daybook.css（令牌 + 基础 + 组件 + 正文）、app.css、search.css ← 唯一写样式的地方
├─ scripts/      client.ts（主题 / 导航 / 加载条 / TOC / 热力图 / 折叠 / 入场）、gallery.ts、music-player.ts
├─ config/       site.ts（站点配置）、links.ts、defaults.ts、schema.ts、index.ts
├─ i18n/         构建时语言包（zh-CN / zh-TW / ja / en）与日期、复数格式化
├─ lib/          构建期逻辑：content/、markdown / markdown-pipeline、feed / feed-build、pagination、nav、comments、music、time
├─ types/        公共类型
└─ content/      daily/（日记）、post/（文章）、pages/（独立页面，如 music.mdx）、spec/（关于页正文，如 about.mdx）

content/         可选独立内容仓库：post/、daily/、pages/、spec/、public/、config/；默认被 .gitignore 忽略
public/         主题 public（仅主题模式）：favicon、头像、寒蝉全圆体分片、音乐、og 图；
                内容模式改用 <内容根>/public，可由 pnpm og:content 生成 og 图
docs/            配置、内容、音乐、部署与安全边界等文档
scripts/         make-og-image.ts、astro.mjs（Astro 包装器：模式参数与内容缓存切换）、site-context.ts、
                 read-content-config.ts、content-repo.ts / content-repo-lib.ts（clone/pull）
tests/           单元断言与构建产物断言
astro.config.ts  markdown 管线、env schema、集成、alias `@` → `src`；内容模式加载 content/config
```

路由（`src/pages`）：`/`、`/page/[page]`、`/posts`、`/posts/page/[page]`、`/[...slug]`（日记/文章详情）、`/[...page]`（`content/pages` 独立页面，如 `/music`）、`/about`、`/friends`、`/archives`、`/categories`(+`/[category]`)、`/tags`(+`/[tag]`)、`/404`，以及 `feed.xml` / `feed-diary.xml` / `feed-posts.xml`、`sitemap.xml`、`robots.txt`。

数据流：当前模式的内容根（默认 `src/content/`，内容模式为 `CONTENT_REPO`）里的 frontmatter 经 Zod 校验 → `src/lib/content/` 解析、排序、筛选 → `src/pages/` 在构建期取数并渲染 Astro 模板 → 静态 HTML + 少量交互岛；`postbuild` 再对 `dist/` 建立 Pagefind 索引。

约定：

- 集合定义在 `src/content.config.ts`，schema 在 `src/lib/content/schema.ts`；两者都是 strict，写错字段会构建失败。
- 配置是 TS 文件而非 YAML，加载时经 `src/config/schema.ts` 校验，非法值中断构建并指出字段路径。
- 内容目录与 publicDir 不硬编码：统一用 `src/lib/content/paths.ts` 的 `contentBase` / `contentGlobBase` / `relativePathForCollection` / `resolvePublicDir`；新增读取内容路径的代码时不要写死 `src/content/` 或 `public/`。
- 内容模式下 `src/config/site.ts` / `links.ts` 会被插件替换为内容仓库配置，页面代码继续从这两个模块导入即可；配置加载与校验在 `scripts/site-context.ts`。
- 内容仓库配置只允许通过 `import type` 复用主题的 `SiteConfigInput` / `LinksConfigInput`，不要 import 主题运行时模块；类型在 tsx 读取时擦除。内容文件的修改由 content layer 热更新，内容配置的修改由 Astro dev 自动重启，不要提示用户手动重启。
- 组件里不写 `<style>`，样式与类名规则见下一节。

## 4. 样式与布局说明

一句话：**像一页可以慢慢读的日记内页，而不是一叠卡片。**

- **样式只写在 `src/styles/*.css`**：`daybook.css`（令牌 + 基础 + 组件 + 正文）、`app.css`（折叠、锁定页、Shiki / KaTeX、抽屉、加载条、图片占位）、`search.css`（搜索面板）。唯一例外是 `components/comments/providers/` 里第三方厂商的 `?inline` CSS。
- **颜色只用令牌**：`daybook.css` 顶部的 HSL 三元组，使用时写成 `hsl(var(--rose))`。粉色分两档——装饰用 `--pink-decor`，可读文字必须用 `--rose`。不新增颜色，不硬编码 HEX。
- **纸页结构**：纸面元素一律 `border-radius: 0`、无阴影，边框只有 `1px solid hsl(var(--border))` 一种；圆角与阴影只留给浮层（搜索面板、评论弹层、音乐卡片）。
- **版式尺**：`--wrap` 1080、列表与详情列 `--feed` 740（日期栏 152 + 间隙 28 + 正文 560）、首页时间流 `--feed-stream` 710、索引页 `--index` 900；详情页正文 `max-width: 34em`。
- **字体**：正文 `--font-sans`（寒蝉全圆体 → 霞鹜文楷 → system-ui），标题与按钮 `--font-bold`，代码 `--font-mono`。字体是子集分片，体积敏感，不引入新字体或新字重。
- **装饰语言只有两种**：`✦` 四角星与 1.6px 铅笔线稿；不出现 emoji、图标包、位图装饰。
- **动效要安静**：只动 `opacity` / `transform` / `color` / `background-color`，时长 160–240ms，缓动统一 `var(--ease)`，并且必须能被 `prefers-reduced-motion: reduce` 关掉。
- **类名 `a-` 前缀**；每个页面恰好渲染一个 `<section class="a-view" data-view="…">`，内部包一层 `.a-wrap`。
- **断点只有四个**：1024（详情页三栏）、1199（去掉日期栏）、1023（导航收进抽屉 + 底部导航）、767（日期横排、隐藏线稿）；`hover: hover` 管悬停态。不要新增断点，优先用 `clamp()` 解决中间态。

改样式前先问一句：改完之后，这一屏是否仍然像一页可以慢慢读的日记内页？需要新增颜色、字体、图标，或要改动页面骨架、阅读列宽时，先停下来和用户确认。

## 5. 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 主题模式开发服务器（:4321） |
| `pnpm build` | 主题模式静态构建，并由 `postbuild` 生成 Pagefind 索引 |
| `pnpm dev:content` / `pnpm build:content` | 内容模式开发 / 构建（`build:content` 含 Pagefind） |
| `pnpm check:content` / `pnpm preview:content` | 内容模式类型检查 / 预览 |
| `pnpm preview` | 预览 `dist/` |
| `pnpm check` | `astro check`（类型、模板、内容 schema；经 `scripts/astro.mjs` 包装器） |
| `pnpm content:clone` / `pnpm content:pull` | 按 `.env` 克隆 / 快进拉取内容仓库 |
| `pnpm lint` / `pnpm format` | Biome 检查 / 格式化 |
| `pnpm test` | 单元断言 + 构建产物断言 |
| `pnpm og` | 重新生成主题 `public/og-default.png` |
| `pnpm og:content` | 为内容仓库生成 `<内容根>/public/og-default.png` |

- 包管理器只用 pnpm：不要用 npm / yarn，也不要更换 lockfile。
- `postbuild` 依赖 `.npmrc` 里的 `enable-pre-post-scripts=true`，不要删除或覆盖。
- 改了 `src/lib/` 的内容查询、分页、feed，或改动了页面结构时，构建后补跑 `pnpm test`。
- 内容模式改动还要补跑 `pnpm check:content` 与 `pnpm build:content`；内容构建依赖本地内容仓库，不并入默认 `pnpm test`。
- Biome 不覆盖 `docs/`、`*.md`、`src/styles/`、`public/`，这些文件手动保持格式一致。

## 6. 安全与约束

- **密码保护是静态分发下的轻量遮挡，不是服务端鉴权**：密文随 HTML 公开，有能力的人可以离线爆破；真正敏感的内容不要放进来。完整边界见 [docs/configuration.md#安全边界](./docs/configuration.md#安全边界)。
- **不要把密钥写进 `src/config/site.ts`**：客户端可见的值只走 `PUBLIC_` 前缀的环境变量（见 `astro.config.ts` 的 `env.schema` 与 `.env.example`），密钥类信息不要进仓库。
- **`inject.headEnd` / `inject.bodyEnd` 原样输出**，不做转义与清洗，只放站点所有者自己维护的可信 HTML。
- **样式硬禁令**：新增颜色 / 渐变 / 字体 / 图标包；给纸面元素加卡片描边、圆角、投影；用 `--pink-decor` 写可读小字；emoji 与位图装饰；在组件里写 `<style>` 或内联 `style`；弹跳、视差、自动播放等强动效。
- **改依赖、升级框架、改 Astro 配置**要单独提交，动手前先说明影响范围；样式任务里不要顺带升级依赖。
- 内容 frontmatter 是 strict schema：日记没有 `categories` / `tags` / `keywords`，写了会构建失败。
- 示例歌单的音频、封面与歌词托管在外部 CDN（地址见 `src/content/pages/music.mdx`），仓库不含这些文件；曲目版权归各自权利人，正式使用前替换成自己的资源。
- **不要提交 `.env`**：`CONTENT_REPO_URL` 可能内联 HTTP token，`CONTENT_REPO_SSH_KEY` 指向私钥；`content:clone` / `content:pull` 会脱敏日志，但不要手动把凭据贴进文档、issue 或提交。

## 7. Git 提交规范

- 仅在用户明确要求时创建提交；不要修改或 rebase 已推送的历史。
- 每次提交只包含一个逻辑变更，不混入无关格式化、重构或依赖升级。
- 提交信息遵循 Conventional Commits：

  `<type>(<scope>): <description>`

  - `type` 必填且小写：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`ci`
  - `scope` 可选，小写，表示影响范围，如 `auth`、`parser`、`api`
  - `description` 使用英文祈使句，小写开头，不加句号，尽量不超过 50 字符
- 正文与描述之间空一行，重点说明“为什么改”及必要背景，不重复描述“改了什么”。
- 关联 Issue 使用脚注，如 `Closes #123`。
- 破坏性变更必须在 type/scope 后加 `!`，或在脚注中写 `BREAKING CHANGE: <说明>`。
- 禁止使用 `update`、`fix bug`、`changes` 等模糊提交信息。
- 若 commitlint / Husky 校验失败，修正提交信息，不要使用 `--no-verify` 绕过。

示例：

```text
feat(auth): add JWT-based login

Replace session-based login to support distributed deployments.

Closes #123
```

```text
refactor(api)!: remove deprecated endpoint

BREAKING CHANGE: `/v1/users` has been removed; use `/v2/users`.
```

## 8. 提交前验证

```bash
pnpm check      # 类型、模板与内容 schema
pnpm lint       # Biome
pnpm build      # 静态构建 + Pagefind 索引
pnpm test       # 涉及 lib/、内容查询、分页时
```

- 改了页面或样式时，用 `pnpm dev` 或 `pnpm preview` 人工过一遍浅色 / 深色，以及 375 / 768 / 1024 / 1440 四个宽度。
- 提交信息用中文简述「改了什么 + 为什么」，与仓库现有历史保持一致（非 Conventional Commits）。
- 不要提交 `dist/`、`.astro/`、`node_modules/`、`.env`。
