# 写日记、文章与独立页面

这页说明 Daybook 的内容放在哪里、frontmatter 怎么写、URL 与日期怎么确定，以及草稿、隐藏、密码与评论这些可见性开关怎么用。命令都在仓库根目录执行；先按[快速开始](./quick-start.md)把站点跑起来，再回来写内容。

## 内容放在哪里

Daybook 把内容分成四个集合，定义在 `src/content.config.ts`：

| 目录（主题模式） | 集合 | 放什么 | 访问地址 |
| --- | --- | --- | --- |
| `src/content/daily/` | `dailyCollection` | 日记 | `/daily/<文件路径>` |
| `src/content/post/` | `postsCollection` | 文章 | `/post/<文件路径>` |
| `src/content/pages/` | `pagesCollection` | 独立页面（如 `music.mdx`） | `/<文件路径>` |
| `src/content/spec/` | `specCollection` | 关于页正文 `about.mdx` | `/about` |

- `daily`、`post`、`pages` 三个集合的 frontmatter schema 是 strict：写了 schema 之外的字段会中断构建，并指出出错的文件。
- 文件扩展名只认小写 `.md` 与 `.mdx`；子目录会保留到 URL 里，例如 `src/content/daily/2026/10/23-year.md` 对应 `/daily/2026/10/23-year`。
- `src/content/spec/` 只放 `/about` 的正文：页面不读 frontmatter，写了也不会报错，但不会生效。小节用 `##` 写，渲染时会自动加 ✦ 装饰与锚点；`about.mdx` 缺失会让 `/about` 构建失败。
- 使用内容模式时，四个目录都在 `CONTENT_REPO` 指向的内容根下（默认 `content/`），规则与主题模式相同；见[双仓库：主题与内容分离](./dual-repo.md#内容仓库配置)。

## 写一篇日记

1. 在 `src/content/daily/` 新建 `.md` 或 `.mdx` 文件，文件名建议以日期开头，例如 `2026-11-14-first-diary.md`。
2. 在文件开头写 frontmatter，至少要写 `date`；正文写在第二个 `---` 之后。

```md
---
title: 十一月的第一杯茶
date: 2026-11-14 21:30:00
---

今天把站点跑起来了。风很轻，茶凉得刚好。
```

- `date` 必填，`title` 可选。没有标题时，详情页、归档与 RSS 的标题按 `siteConfig.dailyTitleFallback` 回退（默认详情页与 RSS 用日期，归档用 slug），完整配置写在[配置说明](./configuration.md)里。
- `category` 是日记自己的展示标签，显示在首页条目、详情页日期栏与归档里；不生成分类页或 URL，也不进入搜索筛选。
- 日记默认出现在首页时间流与归档；`pin: true` 会把它放进首页的置顶分组。
- 首页条目显示正文；正文纯文本超过 300 个字符时会带「展开全文」折叠。

写完打开 `http://localhost:4321/daily/2026-11-14-first-diary` 检查标题、日期与正文；URL 规则见下一节。

## 写一篇文章

1. 在 `src/content/post/` 新建 `.md` 或 `.mdx` 文件。
2. 写 frontmatter，`title` 与 `date` 必填。

```md
---
title: 用 Pagefind 给中文博客做搜索
date: 2026-11-14 10:00:00
categories: [前端]
tags: [Astro, 搜索]
keywords: [静态博客, Pagefind]
---

正文从这里开始。
```

- 文章出现在 `/posts`；列表行显示置顶、加密与草稿标记，以及标题、摘要、日期与阅读时长。
- `categories` 里的每个名字都会生成分类页；第一个分类还会用于详情页日期栏、Pagefind 的 `category` 筛选值与文章结构化数据的 `articleSection`。不生成二级分类。
- `tags` 用于标签页与 Pagefind 的 `tag` 筛选值。
- `keywords` 写入页面的 `<meta name="keywords">` 与文章结构化数据。
- 分类与标签名不能包含 `/`、`?`、`#`，否则构建失败；`siteConfig.taxonomy` 只能为合法名字指定 URL slug，不能绕过这条限制。
- 列表排序默认 `pin` 降序 → `date` 降序 → `slug` 升序；归档页和三份 RSS 是例外，只按 `date` 降序。

## frontmatter 参考

下面三张表分别对应日记、文章与独立页面；字段与校验定义在 `src/lib/content/schema.ts`，日期字段的值写成字符串，解析规则见「URL、slug 与日期」。

### 日记（`dailyCollection`）

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `date` | string | 必填 | 日期；写法见「URL、slug 与日期」 |
| `title` | string | — | 可选；省略时按 `dailyTitleFallback` 回退 |
| `category` | string | — | 日记展示标签，不生成 URL |
| `updated` | string | — | 可选；详情页显示「更新于」；不参与排序 |
| `description` | string | — | 可选；不写时自动生成摘要 |
| `slug` | string | 文件相对路径 | 覆盖默认 slug，影响 `/daily/` 之后的路径 |
| `permalink` | string | — | 覆盖完整 URL，不再带集合前缀 |
| `draft` | boolean | `false` | 生产构建不生成详情页 |
| `pin` | boolean | `false` | 进入首页置顶分组，并在列表排序时置顶 |
| `password` | string | — | 非空字符串；构建期加密正文，仅 `.md` |
| `hideFrom` | string[] | — | 不写即不隐藏；可选值见「控制可见性」 |
| `comments` | boolean | `true` | 单篇评论开关 |
| `hideHomeTitle` | boolean | `false` | 只在首页条目里隐藏标题 |

### 文章（`postsCollection`）

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 必填 | 不能为空 |
| `date` | string | 必填 | 日期；写法见「URL、slug 与日期」 |
| `updated` | string | — | 可选；详情页显示「更新于」；不参与排序 |
| `description` | string | — | 可选；不写时自动生成摘要 |
| `categories` | string[] | `[]` | 分类；第一个分类用于分类页与搜索筛选 |
| `tags` | string[] | `[]` | 标签；用于标签页与搜索筛选 |
| `keywords` | string[] | `[]` | SEO 关键词；写入 meta 与结构化数据 |
| `slug` | string | 文件相对路径 | 覆盖默认 slug，影响 `/post/` 之后的路径 |
| `permalink` | string | — | 覆盖完整 URL，不再带集合前缀 |
| `draft` | boolean | `false` | 生产构建不生成详情页 |
| `pin` | boolean | `false` | 文章列表与分类/标签排序时置顶 |
| `password` | string | — | 非空字符串；构建期加密正文，仅 `.md` |
| `hideFrom` | string[] | — | 不写即不隐藏；可选值见「控制可见性」 |
| `comments` | boolean | `true` | 单篇评论开关 |

### 独立页面（`pagesCollection`）

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 必填 | 不能为空 |
| `date` | string | — | 可选；显示在页面元信息里 |
| `updated` | string | — | 可选；写入页面的修改时间元数据 |
| `description` | string | — | 可选；不写时回退到站点 `description` |
| `draft` | boolean | `false` | 生产构建不生成页面 |
| `hideFrom` | string[] | `[]` | 只对 `search` 与 `sitemap` 有实际作用 |
| `comments` | boolean | `true` | 单篇评论开关 |

独立页面是 strict schema：不接受 `slug`、`permalink`、`pin`、`password`、`layout`，写了会中断构建。页面 URL 固定由文件路径决定。

## URL、slug 与日期

### URL 与 slug

- 默认 URL 由「集合前缀 + 文件相对集合根目录的路径（去掉扩展名）」生成：
  - `src/content/daily/2026-11-14-first-diary.md` → `/daily/2026-11-14-first-diary`
  - `src/content/daily/2026/10/23-year.md` → `/daily/2026/10/23-year`
  - `src/content/post/image-layout.mdx` → `/post/image-layout`
  - `src/content/pages/music.mdx` → `/music`；`src/content/pages/notes/a.mdx` → `/notes/a`；`index.mdx` 对应 `/index`，不会折叠成父路径。
- `slug` 覆盖默认的文件路径部分，集合前缀保留：`slug: hello` → `/daily/hello`。
- `permalink` 覆盖完整 URL：`permalink: notes/hello` → `/notes/hello`，不再带集合前缀。
- 首尾的 `/` 可以省略，构建时会规范化；`slug` 与 `permalink` 都不能为空。
- 值里不能出现 `?`、`#`、反斜杠，也不能有空路径段、`.` 或 `..` 路径段。
- 以下冲突会在构建时报错并指出文件：固定路由（`/`、`/posts`、`/categories`、`/tags`、`/archives`、`/about`、`/friends`、`/404`、`/feed.xml`、`/feed-diary.xml`、`/feed-posts.xml`、`/sitemap.xml`、`/robots.txt`）、保留前缀（`/page/`、`/posts/page/`、`/categories/`、`/tags/`），以及其它内容或独立页面的 URL。
- 独立页面的 URL 就是文件 id，不接受 `slug` 与 `permalink`。
- 内容模式下把 `src/content/` 换成内容根目录，生成规则不变。

### 日期

`date` 与 `updated` 接受三种写法：

- `YYYY-MM-DD`
- `YYYY-MM-DD HH:mm:ss`（也接受 `T` 分隔；秒可以省略）
- 带 `Z` 或 `±HH:mm`（也接受 `±HHmm`）偏移量的 ISO 8601

- 不带时区的写法按 `siteConfig.timezone` 解释；带偏移量的写法按绝对时刻解析。
- 展示、RSS 的 `pubDate` 与 sitemap 的 `lastmod` 都按配置时区格式化。
- 不带时区的写法会严格校验日历：`2026-02-30` 这类日期会构建失败。带偏移量的写法交给 JavaScript 的 `Date` 解析，个别越界日期可能被规范化而不报错。
- 格式不支持或值为空时会报 `[daybook:content]`，错误信息指出文件与字段。
- `updated` 用于详情页的「更新于」、页面的修改时间元数据与 sitemap 的 `lastmod`，不参与排序；不写时不显示。

## 摘要与阅读时长

### 摘要

- 手写 `description` 优先，原样使用。
- 不写时从正文自动提取：去掉 Markdown 与 HTML 标记、代码块、图片与链接地址，合并空白，取前 200 个 Unicode 字符；超出时追加 `…`。MDX 会先剥离 `import` / `export` 与 `{表达式}`。
- 密码内容的 `description` 手写值保留；没有手写值时使用本地化的「这篇日记已加密」或「这篇文章已加密」，不会改用标题或正文。
- 正文也提取不到文字时（例如只有图片），回退到本地化的「还没有摘要」文案。
- 摘要用于详情页的 `<meta name="description">` 与分享卡片、文章列表行与 RSS 条目；独立页面不写 `description` 时回退到站点 `description`。

### 阅读时长

- 按非空白 Unicode 字符 400 字/分钟估算，向上取整，最少 1 分钟。
- 估算前会去掉围栏代码块、行内代码、图片、链接地址、HTML 标签以及标题、引用与列表标记；列表项的文字仍然计入。
- 详情页 meta 行与文章列表行显示阅读时长；首页日记条目与归档列表不显示。
- `updated` 存在时，详情页 meta 行会多显示「更新于」；日期格式跟随界面语言（`zh_CN` 为 `yyyy-MM-dd`）。

## 正文图片与链接

### 图片

- 图片独占一行时渲染为图块，图注取 `alt`；同一行用空格隔开的 2 张及以上图片会并排显示，每张各有自己的图注。
- 位图的独占单图在视口宽于 `767px` 时最高约 2/3 屏高（`max-height: min(66vh, 640px)`），图框收紧并水平居中；视口不超过 `767px` 时不限高。SVG 与并排图不参与限高。
- 所有正文图片自动加 `loading="lazy"` 与 `decoding="async"`；加载前显示灰色占位块，加载失败时在占位块内显示 `alt` 文本。
- 本地图片放在当前模式的 public 目录：主题模式是 `public/images/`，内容模式是 `<内容根>/public/images/`；正文统一用 `/images/...` 引用。远程图片直接写完整 URL。
- Markdown 图片的图注取 `alt`；不想显示图注就留空 `alt`，但会失去无障碍描述。MDX 的 `Figure` 组件另有 `caption` 属性，见「独立页面与 MDX」。
- 仓库里可对照的示例：`src/content/post/image-layout.mdx` 覆盖独占、紧跟文字、连续、同一行并排、空 `alt` 与竖图；`src/content/daily/2026-11-01-image.md` 是同一行并排两张图。

### 链接

- `http://` / `https://` 开头且 host 与 `siteConfig.url` 不同的链接算外链，自动补 `target="_blank"` 与 `rel="noopener"`。
- 同 host 的绝对地址（`http` / `https` 互换也算同站）、`/` 开头的站内路径、`#` 锚点以及 `mailto:` / `tel:` 链接保持原样。
- 首页日记正文、详情页、独立页面与 RSS 全文共用这套链接处理规则。

## 控制可见性

可见性由 frontmatter 的 `draft`、`hideFrom`、`password`，以及 `comments`、`hideHomeTitle` 控制。下面的矩阵先给整体结论，后面逐项解释。

### 可见性矩阵

| 设置 | 首页 | 文章列表 | 归档 | 分类/标签 | 搜索 | RSS | sitemap | 详情页 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 默认 | 可见 | 可见 | 可见 | 可见 | 可搜 | 收录 | 收录 | 可访问 |
| `draft: true`（生产构建） | — | — | — | — | — | — | — | 不生成 |
| `draft: true`（`pnpm dev`） | 带草稿标记 | 带草稿标记 | 可见 | 可见 | 不索引 | 不收录 | 不收录 | 生成，带草稿标记 |
| `hideFrom: [home]` | — | 可见 | 可见 | 可见 | 可搜 | 收录 | 收录 | 可访问 |
| `hideFrom: [rss]` | 可见 | 可见 | 可见 | 可见 | 可搜 | — | 收录 | 可访问 |
| `hideFrom: [archive]` | 可见 | 可见 | — | 可见 | 可搜 | 收录 | 收录 | 可访问 |
| `hideFrom: [search]` | 可见 | 可见 | 可见 | 可见 | 不索引 | 收录 | 收录 | 可访问 |
| `hideFrom: [tag]` | 可见 | 可见 | 可见 | 标签页 — | 可搜 | 收录 | 收录 | 可访问 |
| `hideFrom: [category]` | 可见 | 可见 | 可见 | 分类页 — | 可搜 | 收录 | 收录 | 可访问 |
| `hideFrom: [sitemap]` | 可见 | 可见 | 可见 | 可见 | 可搜 | 收录 | — | 可访问，noindex, nofollow |
| `password` | 标题 + 摘要 | 标题 + 摘要 | 标题 | 标题 | 标题 + 摘要 | 标题 + 摘要 | 默认 — | 标题 + 摘要，正文加密 |

- 「可见」指该类内容本来会出现在这个位置：日记出现在首页、归档、RSS、搜索与 sitemap；文章出现在文章列表、归档、分类/标签、RSS、搜索与 sitemap。
- `—` 表示被排除；「可访问」表示详情页仍然生成、状态码不变。
- `hideFrom` 只影响列表、索引与收录；除草稿外，内容的详情页始终会生成。
- 评论与首页标题不按位置隐藏，见下面两小节。

### 草稿

- `draft: true` 时，生产构建不生成详情页；首页、文章列表、归档、分类/标签、RSS、站内搜索与 sitemap 全部排除。
- `pnpm dev` 下正常生成并显示：首页条目、文章列表行、详情页与独立页面的 meta 带「草稿」标记；归档与分类/标签列表行没有草稿标记。
- 开发环境里的 RSS、搜索与 sitemap 仍然排除草稿，避免误发布。
- 文章列表没有对应的 `hideFrom` 值：不希望文章出现在列表里，就保持 `draft: true`，发布时再改回来。

### 按位置隐藏 hideFrom

- 可选值：`home`（首页）、`rss`（三份 RSS）、`archive`（归档）、`search`（站内搜索索引）、`tag`（标签页）、`category`（分类页）、`sitemap`（sitemap 与详情页 noindex）。
- 可以写多个值，效果取并集；不写等于空数组。
- 只影响聚合、索引与收录：不是草稿的内容详情页仍然生成、可以访问，状态码不变。
- `hideFrom: [sitemap]` 会让详情页输出 `<meta name="robots" content="noindex, nofollow">`，并从 `sitemap.xml` 排除。
- `tag` 与 `category` 对日记没有作用；文章的分类页与标签页在计数时也会排除被隐藏的条目。

### 密码保护

- `password` 是非空字符串，会在构建期把渲染后的正文用 AES-256-GCM 加密；浏览器里输入密码后由 Web Crypto 在本地解密。
- 加密只支持 `.md`：`.mdx` 写了 `password` 会构建报错，提示改用 `.md` 或移除 `password`。
- 列表、归档、分类/标签、RSS 与搜索只使用标题与 `description`；正文不会以明文出现在 HTML 里。
- 详情页输出 `<meta name="robots" content="noindex, nofollow">`；默认不进 sitemap，可由 `siteConfig.sitemap.includeProtected` 打开；`robots.txt` 会把密码页加入 `Disallow`。
- 密码错误时提示「密码错误，请再试一次」；解锁状态不写入浏览器存储，刷新或离开页面后重新锁定。
- 正文的 Markdown 扩展与普通文章一致：解密后浏览器会补做客户端增强（代码复制、Mermaid、GitHub 卡片、嵌入、音乐播放器、`:hidden` 等）。
- 密码内容的评论区在解锁后才加载。
- 密码保护是静态分发下的遮挡，不是服务端鉴权：密文随 HTML 公开，可以离线爆破；真正敏感的内容不要放进来。完整边界见[配置说明的安全边界](./configuration.md#安全边界)。

### 评论 comments

- `comments` 默认 `true`；设为 `false` 只关闭当前这一篇。
- 评论区只有在站点 `comments.enabled` 为 `true`、且 `provider` 受支持（`twikoo` / `waline` / `artalk`）时才渲染，站点级配置写在[配置说明的评论](./configuration.md#评论)里。本仓库自带的 `src/config/site.ts` 把 `comments.enabled` 设成了 `false`。

### 首页标题 hideHomeTitle

- 日记的 `hideHomeTitle: true` 只在该篇的首页条目里隐藏标题；正文、详情页、归档、RSS 与搜索不受影响。
- 首页是否显示标题还要看站点 `home.showTitles`（默认 `true`）：两者都允许时才显示。没有写 `title` 的日记在首页本来就不显示标题，回退标题只用于详情页、归档与 RSS。

## 独立页面与 MDX

### 独立页面

- 在 `src/content/pages/` 新建 `.md` 或 `.mdx`。URL 由文件 id 决定：`music.mdx` → `/music`，`notes/a.mdx` → `/notes/a`，`index.mdx` → `/index`。
- 页面由 `src/pages/[...page].astro` 渲染并自动套独立页面外壳；`title` 必填，`date`、`updated`、`description`、`draft`、`hideFrom`、`comments` 可选。
- 不接受 `slug`、`permalink`、`pin`、`password`、`layout`，写了会在构建时报 strict schema 错误。
- 独立页面不参与首页、文章列表、归档、分类/标签与 RSS；默认进入 sitemap 与站内搜索。`hideFrom` 里只有 `search`（不建索引）与 `sitemap`（noindex 且不收录）对它有效，`draft` 同样生效。
- 不要把独立页面写进 `siteConfig.nav`、`footerNav` 或 `bottomNav`：构建期导航校验只认固定路由、日记/文章 URL、分类/标签与分页，独立页面会报「导航链接 /music 没有对应路由」。要从正文或关于页链接它。
- 仓库示例：`src/content/pages/music.mdx`（音乐页）。
- 关于页正文不是独立页面：`src/content/spec/about.mdx` 由 `/about` 读取，不需要 frontmatter，缺失会让构建失败。

### MDX

- `.md` 与 `.mdx` 都支持；MDX 可以导入组件，适合在正文里插图、放播放器或写 JSX。
- `@ui` 是组件别名（`tsconfig.json` 的 `paths` 指向 `src/components/index.ts`），可以具名导入 `Figure` 与 `MusicPlayer`。相对导入按当前 MDX 文件的位置解析，推荐用 `@ui`，文件移动时不用改路径。
- `Figure` 的用法：

```mdx
---
title: 用 Figure 插图
date: 2026-11-14 10:00:00
---

import { Figure } from '@ui';
import cover from './cover.jpg';

<Figure src={cover} alt="山脊上的日落" caption="图注可选" />
```

- `Figure` 的 props：`src` 必填（`import` 的图片，或 public 路径/远程地址字符串）；`alt` 必填；`caption` 省略时取 `alt`，传空字符串不渲染图注；`width` / `height` 可选；`loading` 默认 `lazy`；`quality` 只对 `import` 的图片生效。
- MDX 不支持 `password`，需要加密的内容请改用 `.md`。
- `siteConfig.rss.fullText` 为 `true` 时，MDX 文章回退到摘要，并在构建期输出一次警告；默认 `false` 不受影响。
- MDX 里的 Markdown 增强与 `.md` 相同，见 [Markdown 增强](./markdown.md)；音乐播放器见[音乐播放器](./music-player.md)，Meting 用法见 [Meting API 的服务端缓存](./developers/meting-api.md#服务端缓存)。

## 写完检查

- [ ] 文件在正确的集合目录，扩展名是小写 `.md` 或 `.mdx`。
- [ ] frontmatter 从文件第一个字节开始（允许 UTF-8 BOM），第一行是 `---`，第二个 `---` 之后才是正文。
- [ ] `date` 存在且格式合法；`updated` 如果写了也合法。
- [ ] 没有写该集合 schema 之外的字段：日记没有 `categories` / `tags` / `keywords`，独立页面没有 `slug` / `permalink` / `pin` / `password` / `layout`。
- [ ] `pnpm dev` 下打开首页、`/posts` 或对应详情页，确认日期、标题、摘要与阅读时长符合预期。
- [ ] 可见性符合预期：草稿只在开发环境出现；`hideFrom` 的列表与索引符合上面的矩阵；密码内容用错误密码会提示「密码错误，请再试一次」。
- [ ] 图片与链接正常：本地图放在 public 目录，外链在新标签页打开。
- [ ] `pnpm build` 没有报错；需要时用 `pnpm preview` 检查构建产物（搜索索引由 `pnpm build` 生成）。

相关页面：[快速开始](./quick-start.md)、[Markdown 增强](./markdown.md)、[音乐播放器](./music-player.md)、[配置说明](./configuration.md)、[排错](./troubleshooting.md)、[文档索引](./README.md)。
