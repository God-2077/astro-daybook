# 实现取舍

这页面向维护者：说明主题为什么长成现在这样、参考了哪些项目、在配置 / 日期 / 加密 / 搜索 / 内容模式上各做了哪些取舍，以及改代码时要守的约定。读之前先看 [AGENTS.md](../../AGENTS.md) 的目录结构与样式规则，用户侧字段与用法看[配置说明](../configuration.md)和[双仓库](../dual-repo.md)。适用于仓库 `main` 分支当前代码（`package.json` 1.2.1）。

## 参考主题与借鉴点

以下主题只作结构与实现思路的参考，**不是构建依赖**，不出现在 `package.json` 里，构建也不读取它们：

| 主题 | Commit | 主要参考点 |
| --- | --- | --- |
| [astro-koharu](https://github.com/cosZone/astro-koharu) | `329ce55513a8057708c93c11c5b8c096680ad83c` | `formatInTimeZone` 日期格式化、Pagefind 加载与路径处理、加密常量组织 |
| [Firefly](https://github.com/CuteLeaf/Firefly) | `cd920b035b475fe9a6cd3a88afb42cf9440bb8a9` | `src/config/*.ts` 拆分、`SiteConfig` 类型、加密载荷（salt/iv/tag/ciphertext）、Pagefind loader 与 `pagefind.yml` |
| [Mizuki](https://github.com/LyraVoid/Mizuki) | `c06f0003089ca040d5b599b37f0ad0ae65726e95` | 配置默认值/覆盖思路、密码校验前缀、Pagefind 事件 |
| [fuwari](https://github.com/saicaca/fuwari) | `6d39b0dec41282e7852e23e032998a5789abee28` | 单文件 TS 配置、导航预设、`data-pagefind-body` 封装 |

## 关键取舍

### 配置

参考 Firefly / Mizuki / fuwari 的 `src/config/*.ts` + 类型文件模式，但：

- 不采用 Svelte 或 Tailwind。
- 不采用 Mizuki 的 override loader：本项目直接 `defineSiteConfig()` 合并默认值，再做 Zod 结构校验与语义校验。
- 配置是 TS 文件，不是 YAML；未知字段直接报错，不做静默忽略。
- 内容模式复用同一套 schema 校验内容仓库的 `config/*.ts`，不复制第二份配置定义。

代价：配置在启动时读取，改 `src/config/site.ts` 后要重启 `pnpm dev`；只有内容仓库的配置被单独加进 watchFiles，改完自动重启。

### 日期

参考 astro-koharu 的 `date-fns-tz` 思路：

```ts
formatInTimeZone(date, timezone, 'yyyy-MM')
```

本项目额外处理了 Astro frontmatter 的 YAML 时间戳问题：`yaml` 会把无时区的 `2026-10-20 20:00:00` 解析成 UTC `Date`，解析完就再也判断不出原始字符串带不带偏移量。因此 `src/lib/content/entries.ts` 通过 `entry.filePath` 重新读取原始 frontmatter，再用 `src/lib/content/date.ts` 按配置时区解析：

- 不带时区的值按 `siteConfig.timezone` 解释；
- 带 `Z` 或 `±HH:mm` 的 ISO 8601 保留绝对时刻；
- 站内所有展示、RSS `pubDate` 与 sitemap `lastmod` 都用同一个时区格式化。

代价：每条内容在构建期多一次文件读取；换来的是“构建机器的时区不影响页面日期”。

### 加密

参考 Firefly / Mizuki 的 PBKDF2 + AES-GCM 组合载荷，参数在 `src/lib/content/encrypt.ts`：

- PBKDF2-SHA256，150000 次迭代；
- 盐 16 字节、IV 12 字节，每次加密随机生成；
- AES-256-GCM 密文，认证标签 16 字节，与盐、IV、密文一起 base64 存进 `LockedPayload`；
- 浏览器用 Web Crypto 解密（`src/components/content/LockedContent.tsx`，`tagLength: 128`）。

差异：

- 不使用 sessionStorage 缓存密码；解锁只对当前页面有效，刷新后重新上锁。
- 密码页输出 `noindex`，默认不进 sitemap，Pagefind 只索引标题与描述。
- 错误密码只显示固定文案，不泄露任何明文。
- MDX 不支持 `password`；需要加密的内容用 `.md`。

边界：密文随 HTML 公开，有能力的人可以离线爆破，这是静态分发下的轻量遮挡，不是服务端鉴权。完整边界见[配置说明的安全边界](../configuration.md#安全边界)。

### 搜索

参考 Firefly / astro-koharu 的 loader 与 `pagefind.yml`：

- 动态 ``import(`${import.meta.env.BASE_URL}pagefind/pagefind.js`)``；
- `pagefind.options({ excerptLength: 24 })`；
- `data-pagefind-body` 只放在需要索引的详情页与独立页面；
- `pagefind.yml` 的 `exclude_selectors` 排除 KaTeX、搜索面板、TOC、评论区与分页。

本项目改为自定义 React 搜索面板（全部 / 日记 / 文章 / 页面四个 tab），不引入 Pagefind 默认 UI。索引由构建后的 `pagefind --site dist` 生成，`pnpm dev` 不生成 `dist/pagefind/`，所以开发服务器里搜索没有索引，构建后才能验证搜索结果。

### 内容模式

内容模式不是“把内容目录换个名字”，而是用一套注入与缓存隔离机制让页面代码无感知：

- `scripts/astro.mjs` 把 `--content`、`--content=DIR`、`--content-repo DIR`、`--theme` 转成 `CONTENT_REPO` 环境变量，再启动 Astro；这个包装器是自定义参数与缓存切换唯一的入口。
- `src/lib/content/paths.ts` 统一解析路径：`resolveContentRoot()`、`resolvePublicDir()`、`resolveMetingCacheFile()`，以及给 Astro glob 用的 `contentBase()` / `contentGlobBase()`。新增读取内容路径的代码不要写死 `src/content/` 或 `public/`。
- `scripts/site-context.ts` 在构建配置阶段解析模式；内容模式下用 `node --import tsx` 子进程读取内容仓库的 `config/site.ts` 与 `config/links.ts`（30 秒超时、10 MB 缓冲），经私有标记 `__DAYBOOK_CONTENT_CONFIG__` 把 JSON 传回主进程，再用主题的 `defineSiteConfig()` / `defineLinksConfig()` 校验。
- `astro.config.ts` 的 Vite 插件 `daybook:content-config` 在 `load()` 阶段把主题的 `src/config/site.ts` 与 `links.ts` 替换成解析后的内容仓库配置；页面代码继续从这两个模块导入，不需要改。
- 另一个集成 `daybook:content-config-watch` 与插件的 `configureServer()` 把两个配置文件加进 watchFiles，修改后 Astro dev 自动重启并重新读取；Markdown 内容不触发重启，由 content layer 增量重载。
- 构建缓存隔离：内容模式把 `cacheDir` 指到 `node_modules/.astro-content`；dev / check 仍读写 `.astro/`，所以包装器在 `.astro/daybook-content-mode` 记录来源（`theme` 或 `content:<绝对路径>`），切换来源时删掉 `.astro/data-store.json`、`.astro/content-modules.mjs` 与 `.astro/content-assets.mjs`，避免两套内容的集合条目混在一起。

代价与限制：

- 内容仓库的 `config/*.ts` 由 Node 子进程执行，是可信代码；不适合 import 主题运行时组件，只适合纯配置对象。
- 主题没有为内容仓库提供稳定的组件导入 API；需要引用主题组件时自行评估路径与构建边界。
- `tests/build/assert-dist.ts` 只断言主题示例内容，内容模式的页面需要手动冒烟，或为内容仓库另写断言。

内容仓库的结构、克隆与日常更新见[双仓库](../dual-repo.md)，其中内容配置的写法见[内容仓库配置](../dual-repo.md#内容仓库配置)。

## 版式与样式

没有引入 Tailwind 或第二套设计系统：版式、令牌与组件样式集中在 `src/styles/`。

- `daybook.css`：令牌、基础、组件与正文；颜色、字号、间距全部走文件顶部的 CSS 变量。
- `app.css`：折叠、锁定页、Shiki / KaTeX、抽屉、加载条、图片占位。
- `search.css`：搜索面板。

纸面元素一律 `border-radius: 0`、无阴影，边框只有 1px；圆角与阴影只留给浮层。颜色只从令牌取：装饰用 `--pink-decor`，可读正文与链接用 `--rose`。断点只有 1024 / 1199 / 1023 / 767 四个。组件里不写 `<style>`，唯一例外是 `src/components/comments/providers/` 里第三方厂商的 `?inline` CSS。完整规则见 [AGENTS.md](../../AGENTS.md) 的「样式与布局说明」。

## 字体

字体文件在 `src/assets/fonts/`，四套子集：

| 目录 | 字体 | 用于 |
| --- | --- | --- |
| `ChillRoundFRegular` / `ChillRoundFBold` | 寒蝉全圆体 Regular / Bold | `lang` 不是 `ja` 的构建 |
| `GenJyuuGothic-P-Regular` / `GenJyuuGothic-P-Bold` | Gen Jyuu Gothic P Regular / Bold | `lang` 是 `ja` 的构建 |

- 每个目录里是 `result.css` 加若干 `woff2` 分片，由 [cn-font-split](https://www.npmjs.com/package/cn-font-split) 生成，用 `unicode-range` 按需加载。
- `src/layouts/BaseLayout.astro` 按 `siteConfig.lang` 选择字体 CSS，用 `?url` 导入 `result.css`；这是为了绕开“动态 import 的 CSS 产物没进 dist”的 Astro 行为（见代码注释里的 Astro issue 链接）。
- 两套字体都采用 SIL OFL 1.1 许可。寒蝉全圆体来自 [Warren2060/ChillRound](https://github.com/Warren2060/ChillRound)；Gen Jyuu Gothic P 的版权声明见其 `result.css` 头部（基于 Source Han Sans 与 M+ 字体）。
- 字体是子集分片，体积敏感：不要新增字体、字重或未使用的中文分片。

## 维护约定

- 配置层的文件分工、解析链路与扩展步骤见 [`src/config/README.md`](../../src/config/README.md)。
- 改配置字段时同步改 `src/config/schema.ts`、`src/config/defaults.ts`、`src/types/config.ts`、`src/config/site.ts` 的注释与[配置说明](../configuration.md)；只改其中一处会让默认值、类型与文档对不上。
- 改内容字段或校验时同步改 `src/lib/content/schema.ts`、`src/content.config.ts` 与[写作指引](../writing.md)；内容 schema 与配置 schema 都是 strict，写错字段直接中断构建。
- 读内容或 public 路径时只用 `src/lib/content/paths.ts` 的 helper，不要写死 `src/content/` 或 `public/`，否则内容模式会读错目录。
- 样式只改 `src/styles/*.css`；新增颜色、字体、图标或改页面骨架前先和用户确认，规则见 [AGENTS.md](../../AGENTS.md)。
- Biome 覆盖不到 `docs/`、`*.md`、`src/styles/`、`public/` 和字体目录，这些文件手动保持一致格式。
- 改了 `src/lib/` 的内容查询、分页或 feed，或动了页面结构时，构建后补跑 `pnpm test`；发版前按[验收清单](./acceptance.md)逐项核对。
- 不要提交 `.env`、`dist/`、`.astro/` 与 `node_modules/`；文档改动要同步更新锚点引用，页面结构见[文档索引](../README.md)。
