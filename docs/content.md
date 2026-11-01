# 内容与可见性

## 目录

```text
src/content/daily/   日记
src/content/post/    文章
src/content/spec/    独立页面正文（目前是 about.mdx）
src/pages/*.{md,mdx} 自定义独立页面（.md 或 .mdx）
```

三个集合定义在 `src/content.config.ts`：`dailyCollection`、`postsCollection`、`specCollection`，schema 在 `src/lib/content/schema.ts`。

`spec/` 只放不进入索引与 RSS 的正文，由页面自己按 id 读取（`getEntry('specCollection', 'about')`）。它没有 frontmatter（`specSchema` 是空对象），小节用 `##` 写，构建时自动补 ✦ 与锚点；文件缺失会直接让构建失败并在错误里指出 `src/content/spec/about.mdx`。

## 日记 frontmatter

```yaml
---
title: 日记标题 # 可选
category: 日常 # 可选，首页/详情/归档展示
date: 2026-10-20 21:30:00 # 必填
updated: 2026-10-21 09:00:00 # 可选
description: 手写描述 # 可选
slug: my-slug # 可选，默认由文件路径生成
permalink: notes/my-slug # 可选，覆盖完整 URL
draft: true # 可选，默认 false
pin: true # 可选，默认 false
password: paper2024 # 可选
hideFrom: [home, rss] # 可选
comments: false # 可选，默认 true
hideHomeTitle: true # 可选，只关闭首页条目的标题
---
```

日记没有 `categories` / `tags` / `keywords`；schema 是 strict 的，写了会构建报错。

- `title` 可省略。没有标题时，详情页/归档/RSS/Pagefind 用站点时区下的日期作为回退标题；首页是否显示标题还受 `home.showTitles` 控制。
- `hideHomeTitle` 默认 `false`。设为 `true` 时只在该篇的首页条目里隐藏标题，正文、详情页、归档、RSS 与 Pagefind 都不受影响；它与站点级 `home.showTitles` 取与，两者都允许显示标题时才显示。
- `category` 是日记自己的展示标签（如「日常」「一段回顾」），不会进入文章分类体系、不生成分类页/URL，也不作为 Pagefind 的 `category` 过滤条件。

## 文章 frontmatter

```yaml
---
title: 文章标题 # 必填
date: 2026-09-30 10:00:00 # 必填
updated: 2026-10-01 12:00:00 # 可选
description: 文章描述 # 可选
categories: [文章] # 可选，无二级分类
tags: [Astro, 前端] # 可选，无二级标签
keywords: [静态博客] # 可选，SEO
slug: pagefind-chinese # 可选
permalink: blog/pagefind-chinese # 可选
draft: false
pin: false
password: ''
hideFrom: []
comments: true
---
```

`categories` / `tags` / `keywords` 默认空数组。分类只用于归类与 URL；标签用于标签页、Pagefind filter 与 SEO。

## slug 与 URL

- 默认 slug 由文件相对集合根目录的路径生成，保留目录、去掉 `.md` / `.mdx`。
  - `src/content/daily/2026/10/23-year.md` → `/daily/2026/10/23-year`
  - `src/content/post/astro-blog-studio.mdx` → `/post/astro-blog-studio`
- 配了 `permalink` 时以它为准：`permalink: notes/hello` → `/notes/hello`。
- `slug` / `permalink` 末尾 `/` 可有可无；构建时规范为「以 `/` 开头、不以 `/` 结尾」。
- 禁止 `?`、`#`、反斜杠与 `.` / `..` 路径段。
- 构建时检测冲突：
  - 与固定路由冲突：`/`、`/posts`、`/categories`、`/tags`、`/archives`、`/about`、`/friends`、`/404`、三个 feed、`/sitemap.xml`、`/robots.txt`；
  - 与分页前缀冲突：`/page/*`、`/posts/page/*`；
  - 与分类/标签前缀冲突：`/categories/*`、`/tags/*`；
  - 与另一篇内容 URL 相同。
- 分类/标签名含 `[/?#]` 时，需要在 `siteConfig.taxonomy` 提供 slug 映射；比较区分大小写，仅大小写不同的名称会警告。

## 排序

`pin` 降序 → `date` 降序 → `slug` 升序。`updated` 不参与排序。

## 日期

`date` / `updated` 接受：

- `YYYY-MM-DD`
- `YYYY-MM-DD HH:mm:ss`（也接受 `T` 分隔）
- 带 `Z` 或 `±HH:mm` 偏移量的 ISO 8601

无时区信息时按 `siteConfig.timezone` 解释；带偏移量时按绝对时刻解析。内部统一存为 UTC `Date`，展示、RSS `pubDate`、sitemap `lastmod` 使用配置时区格式化。

实现位置：`src/lib/content/date.ts`。不使用 `z.coerce.date()`：schema 只接受字符串/Date 并转成 ISO 字符串，再由 `entries.ts` 读取原始 frontmatter 后统一解析，避免构建机本地时区影响。

## description

优先级：

1. 手写 `description` 永远保留。
2. 为空时自动摘取正文前 200 个 Unicode 字符：去掉 Markdown/HTML、代码块、图片、链接语法，合并空白，截断时追加 `…`。MDX 会先剥离 `import` / `export` 与 `{表达式}`，避免它们进入摘要。
3. 密码内容：手写值保留；为空时只用标题，回退为「这篇日记已加密」/「这篇文章已加密」。

实现：`src/lib/content/description.ts`。

## 阅读时长

按中文 400 字/分钟估算，去掉代码块与列表，最少 1 分钟。`updated` 存在时，详情页 meta 显示「更新于 YYYY-MM-DD」。

## 正文图片

- 图片独占一行时（与文字之间有没有空行都一样）会渲染为 `<figure class="a-figure"><div class="a-frame">…`，图注取图片 `alt`；与文字同一行的图片仍保持行内。
- 同一行用空格隔开的 2 张及以上图片会渲染为 `<div class="a-figure-row">` 内并排的 figure，每张各自保留细边框与自己图注；窄屏按列自动折行（手机上 3 张折成 2+1），不新增断点。
- 所有正文图片自动加 `loading="lazy"` 与 `decoding="async"`，不阻塞首屏渲染。
- 加载前容器显示灰色占位块（固定 1.6:1 比例、无动画）；加载完成后直接替换为图片；加载失败时在占位块内显示 `alt` 文案。
- 本地图片建议放在 `public/images/`，正文用 `/images/...` 引用；远程图片与普通 Markdown 图片语法一致。

## 正文链接

- `http://` / `https://` 开头且 host 与 `siteConfig.url` 不同的链接，自动补 `target="_blank" rel="noopener"`，在新标签页打开。
- 同 host 的绝对地址（`http` / `https` 互换也算同站）、`/` 开头的站内路径、`#` 锚点与 `mailto:` / `tel:` 链接保持原样。
- 首页日记流、详情页、独立页面与 RSS 全文共用同一套规则；MDX 组件里用 Markdown 语法写的链接同样生效。

## MDX

`dailyCollection` / `postsCollection` 的 loader 同时匹配 `**/*.md` 与 `**/*.mdx`；`src/pages/` 下的独立页面也支持 `.mdx`。

```mdx
---
title: MDX 示例
date: 2026-10-24 10:00:00
---

import { Timeline, TimelineItem } from '@ui';

## 时间线

<Timeline>
  <TimelineItem date="2026-10-24" title="接入 MDX">
    正文可以写 **Markdown**、表达式 {1 + 1}，也可以 import 组件。
  </TimelineItem>
</Timeline>
```

规则：

- MDX 默认继承 `astro.config.ts` 的 `markdown.processor`，因此标题 ✦、`a-h2-anchor`、图片 figure/懒加载、表格包裹、脚注样式与 `.md` 完全一致。
- 组件 children 里也可以写 Markdown（记得用空行分隔段落）；插件会递归 `mdxJsxFlowElement` / `mdxJsxTextElement`，组件内的图片与表格同样得到站点结构。
- 相对路径按 MDX 文件自身位置解析（文章在 `src/content/post/` 时是 `../../components/...`）；推荐直接用 `@ui` 别名具名导入：`import { Timeline, TimelineItem } from '@ui'`。别名在 `tsconfig.json` 的 `paths` 里指向 `src/components/index.ts`，文件移动时不用改 import，编辑器的跳转/补全也走同一份配置。
- **MDX 暂不支持 `password`**：构建期加密需要 HTML 字符串，遇到 `password` 会直接报错。需要加密的内容请继续用 `.md`。
- `siteConfig.rss.fullText: true` 时，MDX 文章回退为摘要并在构建期输出一次警告；默认 `fullText: false` 不受影响。
- 自动摘要与阅读时长会先剥离 MDX 的 ESM 与 `{表达式}`，结果仍是近似值。

### 时间线组件

`src/components/content/Timeline.astro` 与 `TimelineItem.astro` 是本站的 MDX 时间线容器，视觉沿用日记条目的日期刻度：左侧日期栏、1px 细线、`✦` 节点。没有 `type` / `icon` 变体，也不引入 Firefly 的彩色圆点或图标包。

```mdx
import { Timeline, TimelineItem } from '@ui';

<Timeline>
  <TimelineItem date="2026-10-24" title="标题（可选）">
    正文（可选），支持 Markdown。
  </TimelineItem>
</Timeline>
```

- `Timeline` 无 props，渲染为 `<ol class="a-mdx-timeline">`。
- `TimelineItem` 接受可选的 `date`、`title`；`date` 是 ISO 日期时渲染为 `<time datetime>`，否则为 `<span>`。
- 正文通过默认 slot 传入；日期在左侧栏，标题在正文列顶部，节点固定在细线上。
- 样式只写在 `src/styles/daybook.css` 的 `.a-mdx-timeline*`，≤767 收窄日期栏。

## `hideFrom`

可选值：`home`、`rss`、`archive`、`search`、`tag`、`category`、`sitemap`。

- 只影响聚合/列表/索引，不影响详情页 200。
- 多个值取并集。
- 默认不含 `sitemap`；`hideFrom: [sitemap]` 时详情页仍可访问，但不进 sitemap。
- `search` 不输出 `data-pagefind-body`；`tag`/`category` 从对应明细页隐藏，但索引页计数也不包含它（因为计数按可见集合计算）。

## 草稿

`draft: true`：

- 生产构建不生成详情页；首页、文章列表、归档、分类/标签、RSS、sitemap、Pagefind 全部排除。
- 开发环境（`astro dev`）正常显示，列表与详情带「草稿」标记。
- 开发环境的 RSS/搜索/sitemap 仍排除，避免误发布。

## 密码保护

- 构建时用 AES-256-GCM 加密渲染后的正文；密钥由密码经 PBKDF2-SHA256（150,000 次）派生，随机盐 16 字节、IV 12 字节。
- 浏览器用 Web Crypto 解密；密码不写进 HTML/JSON，错误密码只提示「密码错误」。
- 列表/归档/分类/标签/RSS/Pagefind 只公开标题与 `description`。
- 详情页输出 `<meta name="robots" content="noindex">`；默认不进 sitemap，可由 `siteConfig.sitemap.includeProtected` 打开。
- 密码页的 Pagefind body 只包裹标题与描述区域，不包含密文正文。
- 解锁后当前页面展开；不写 sessionStorage/localStorage，刷新或离开即重新锁定。

> 威胁模型：密文随静态 HTML 公开分发，只能防「随手查看」，不能防有决心的离线攻击。真正敏感的内容应使用服务端鉴权。

## 自定义页面

在 `src/pages/` 下新建 `.md` 或 `.mdx`，例如 `src/pages/music.mdx`：

```yaml
---
title: 歌单
layout: ../layouts/PageLayout.astro
date: 2026-10-01 20:00:00
description: 最近在听什么。
# updated:
# draft: true
# hideFrom: [search, sitemap]
---
```

- `title`、`layout` 必填；`layout` 必须指向存在的 `PageLayout.astro`，否则构建报错。
- 路由由文件路径决定：`music.mdx` → `/music`，`notes/a.mdx` → `/notes/a`；`.md` 与 `.mdx` 规则相同。
- 默认进 sitemap 与 Pagefind；`draft` 生产构建后在 `astro:build:done` 删除产物；`hideFrom` 规则与日记/文章一致。
- 支持 `date`/`updated`，并按时区解析（读取源文件原始 frontmatter，避免 Astro 的 UTC 偏移）。
