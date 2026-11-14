# 配置说明

这页是 `src/config/` 的字段手册：列出每个可写字段、默认值、取值范围与校验方式，并说明改完之后怎么验证。读完这页，你能调整站点身份、导航、主题、构建语言、RSS、评论与 Meting 缓存。前置：已按[快速开始](./quick-start.md)在本地跑起站点，并能在仓库根目录执行 `pnpm` 命令。

## 这页管什么

站点的全局设置是两个 TypeScript 文件：

| 文件 | 管什么 |
| --- | --- |
| [`src/config/site.ts`](../src/config/site.ts) | 站点身份（标题、URL、作者、头像）、导航、分页、RSS、评论、SEO、sitemap、robots、HTML 注入与 MDX 增强 |
| [`src/config/links.ts`](../src/config/links.ts) | 友链页的分组与链接 |

两个文件都通过 `defineSiteConfig()` / `defineLinksConfig()` 走同一条链路：

```text
parse（Zod 结构校验）→ resolve（合并默认值）→ validate（语义校验）
```

- 未知字段不会静默失效：写错键名会报 `Unrecognized key` 并中断构建。
- 校验失败抛出 `[daybook:config]` 错误，格式与常见错误见[校验失败](#校验失败)。
- 内容模式（`pnpm dev:content` / `pnpm build:content`）改从 `<内容根>/config/site.ts` 与 `<内容根>/config/links.ts` 读取，字段与校验规则不变；目录结构见[双仓库的「内容仓库配置」](./dual-repo.md#内容仓库配置)。

必填字段只有三个，最小可复制配置如下：

```ts
// src/config/site.ts
import { defineSiteConfig } from './define';

export const siteConfig = defineSiteConfig({
  title: '我的日记',
  url: 'https://example.com',
  author: '你的名字',
});
```

其余字段省略时使用下表的默认值。仓库里的 [`src/config/site.ts`](../src/config/site.ts) 是带逐字段注释的完整示例，可以直接对照修改；它覆盖了部分默认值（`theme: 'light'`、`pagination` 为 8/8、`comments.enabled: false`、`since: 2026`），所以仓库示例配置的实际表现可能与下表默认值不同。

## 站点信息

这一段决定站点是谁、部署在哪、按什么时区与语言渲染。

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 必填 | 站点标题：页签标题后缀、导航与抽屉里的品牌名、RSS 标题、OG `og:site_name`，也是 `footerBrand` 的缺省值 |
| `url` | `string` | 必填 | 站点公开地址。canonical、OG、RSS、sitemap 的绝对链接都由它生成；必须是 `http(s)`，不能带查询参数或 hash，末尾 `/` 会被去掉 |
| `author` | `string` | 必填 | 作者名：关于页 H1 与印章说明、页面 `<meta name="author">` 与 JSON-LD 作者，也是 `copyright.author` 的缺省值 |
| `avatar` | `string` | `''` | 关于页头像。`/` 开头的 public 路径或 `http(s)` URL；留空显示手绘印章 |
| `subtitle` | `string` | `''` | 站点副标题：显示在导航品牌名下方，并作为关于页一句话与 `home.subtitle` 为空时的回退 |
| `footerBrand` | `string` | `title` | 页脚品牌名；写空字符串也回退 `title` |
| `description` | `string` | `''` | 站点长描述：页面 `meta description` 与 OG 描述的缺省内容 |
| `keywords` | `string[]` | `[]` | 写入 `<meta name="keywords">` |
| `timezone` | `string` | `'Asia/Shanghai'` | IANA 时区。内容日期、RSS 时间、sitemap `lastmod`、页脚年份与 `since` 默认值都按它计算；非法值中断构建 |
| `since` | `number` | 当前时区年份 | 建站年份：关于页的 `est.` 年份，也是 `copyright.yearFrom` 的缺省值；取值范围 1900 到当前时区年份 + 1 |
| `lang` | `'en' \| 'ja' \| 'zh_CN' \| 'zh_TW'` | `'zh_CN'` | 构建语言，见[构建语言 `lang`](#构建语言-lang) |
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | 默认主题，见[主题模式 `theme`](#主题模式-theme) |

### 构建语言 `lang`

`lang` 是**构建时**选项：一次 `pnpm build` 只输出一种语言，站内没有语言切换器，也不会生成 `/[lang]` 路由或 hreflang。要换语言，改这个值后重新构建。

跟随 `lang` 变化的是主题 UI 与页面元信息：导航与页脚的默认文案、页面标题、空状态、按钮、分页、搜索面板、密码页、日期与星期格式、RSS `<language>`、`<html lang>`、`og:locale`、JSON-LD `inLanguage`，以及评论后端的界面语言。

- `home`、`labels`、`nav`、`footerNav` 省略时使用当前语言的内置文案；显式配置的值不会被翻译。
- `seo.locale`、`comments.twikoo.lang`、`comments.waline.lang`、`comments.artalk.locale` 省略时由 `lang` 推导，仍可单独覆盖。
- 正文、`title` / `subtitle` / `description`、关于页正文、友链与分类/标签名称属于内容，不会自动翻译；需要其他语言时自行准备对应内容。

| `lang` | `<html lang>` | `og:locale` | Twikoo | Waline | Artalk |
| --- | --- | --- | --- | --- | --- |
| `en` | `en` | `en_US` | `en` | `en` | `en` |
| `ja` | `ja` | `ja_JP` | `ja` | `jp` | `ja` |
| `zh_CN` | `zh-CN` | `zh_CN` | `zh-CN` | `zh-CN` | `zh-CN` |
| `zh_TW` | `zh-TW` | `zh_TW` | `zh-TW` | `zh-TW` | `zh-TW` |

### 主题模式 `theme`

`theme` 决定没有用户偏好时站点显示的明暗模式：

- `light` / `dark`：首次访问强制使用浅色或深色。
- `system`：跟随 `prefers-color-scheme`，系统主题变化时实时跟随。
- 抽屉底部提供「浅色 / 深色 / 自动」三个选项。用户手动选择后写入 `localStorage['daybook-theme']`，优先级高于 `theme`。
- `<html data-theme-mode>` 输出配置值，首屏内联脚本在样式加载前应用主题，`<meta name="theme-color">` 同步更新。

## 首页与导航

这一段决定首页大标题、站内对「日记」的称呼、三处导航与页脚信息。所有默认文案都随 `lang` 变化。

### 首页标题 `home`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `home.title` | `string` | 按 `lang` 内置（`zh_CN` 为 `日记`） | 首页大标题（H1，含首页分页）；不决定站内内容称呼，也不决定浏览器页签标题 |
| `home.subtitle` | `string` | 按 `lang` 内置 | 大标题下的短句；写成空字符串时回退 `subtitle`、`description` |
| `home.showTitles` | `boolean` | `true` | 是否在首页（含首页分页）显示日记条目标题；`false` 时只关闭首页条目标题 |

首页与分页页面的浏览器 `<title>` 使用 `labels.diary`，不是 `home.title`。单篇日记可以用 frontmatter `hideHomeTitle: true` 单独关闭自己的首页条目标题，详情页标题、归档与 RSS 不受影响；frontmatter 写法见[写作](./writing.md)。

### 内容称呼 `labels`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `labels.diary` | `string` | 按 `lang` 内置（`zh_CN` 为 `日记`） | 站内对「日记」类内容的称呼：详情页类型与面包屑、置顶/加密提示、归档、搜索、RSS 文案等；必须非空 |

它不改变路由（详情页 URL 仍是 `/daily/...`）、分类或首页大标题。`home.title` 只控制首页 H1。

### 顶部导航 `nav`

`nav` 是 `NavItem[]`，每个元素是一级链接 `{ title, link }`，或带一层子菜单的分组 `{ title, items }`：

```ts
// src/config/site.ts
nav: [
  { title: '日记', link: '/' },
  {
    title: '文章',
    items: [
      { title: '全部文章', link: '/posts' },
      { title: '归档', link: '/archives' },
    ],
  },
  { title: '友链', link: '/friends' },
],
```

- 分组只能有一层，`items` 至少一项；移动端抽屉里折叠展示。
- 站内链接以 `/` 开头，外链以 `http://` 或 `https://` 开头且不能带查询参数或 hash；外链自动在新窗口打开。
- 内链是否存在对应路由在构建期检查，报错前缀是 `[daybook:project]`。检查范围是固定路由、日记/文章 URL、分类/标签页与分页；独立页面（`content/pages/music.mdx` 生成的 `/music`）不在其中，写进 `nav` 会报错，请从正文或关于页链接它。
- 省略 `nav` 时使用当前语言的内置导航（`zh_CN` 为日记、文章分组、友链、关于）。

路由不存在时的报错示例：

```text
[daybook:project] src/config/site.ts
  导航链接 /music（音乐）没有对应路由；请修正链接或先创建页面
```

### 页脚导航 `footerNav`

`footerNav` 只接受一级链接 `{ title, link }[]`，规则与 `nav` 相同。

- 省略时使用当前语言的内置三项：`/archives`、`/friends`、`/feed.xml`（含 RSS）。
- 显式配置后值不会被翻译，也不会再自动追加 RSS；需要 RSS 入口就自己写进去。
- 内链同样在构建期检查路由。

### 移动端底部导航 `bottomNav`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `bottomNav.enabled` | `boolean` | `true` | 是否显示移动端底部导航（视口宽度 ≤ 1023px）；`false` 时不渲染底栏，也不预留底部空白 |
| `bottomNav.items` | `{ title?, link, icon? }[]` | 内置四项：`/`、`/posts`、`/friends`、`/about` | 入口列表，至少一项；显式配置会整体替换默认四项，不追加 |

- `title` 省略时依次取 `nav` 中对应链接的标题（命中分组子项时用分组名）、当前语言内置文案，最后回退链接本身。
- `icon` 是 `src/assets/sprite.html` 里的 symbol id，必须匹配 `^i-[a-z0-9-]+$`：格式不对会直接中断构建；格式合法但 sprite 中没有该 id 时图标为空。省略时按链接推导（内置四项有对应图标，外链回退 `i-external`，其它链接回退 `i-link`）。
- 站内链接规则与 `nav` 相同，内链在构建期检查路由；外链在新窗口打开。

### 版权与备案 `copyright` / `icp`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `copyright.enabled` | `boolean` | `true` | 是否显示页脚版权信息 |
| `copyright.yearFrom` | `number` | 站点 `since` | 版权起始年份；与当前时区年份相同只显示单年，否则显示「起始–当前」 |
| `copyright.author` | `string` | 站点 `author` | 版权署名 |
| `icp` | `{ text, link? }[]` | `[]` | 页脚备案信息，可多条。`link` 省略时只显示文字；出现时必须是 `http(s)` 外链或以 `/` 开头的内部路径 |

`icp` 与版权信息分开显示：`copyright.enabled` 为 `false` 时，已配置的备案信息仍会输出。

### 分页与归档 `pagination` / `archive`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pagination.daily` | `number` | `20` | 首页日记流每页条数，必须是正整数 |
| `pagination.post` | `number` | `20` | 文章列表每页条数，必须是正整数 |
| `archive.defaultType` | `'articles' \| 'diary'` | `'articles'` | 归档页默认选中的类型；设为 `'diary'` 时日记按钮在前、默认显示日记，统计与热力图也按日记 |

第一页是 `/` 或 `/posts`，不会生成 `/page/1`；越界分页重定向到 `/404`。仓库示例配置把分页设成了 8/8。

### 无标题日记的标题回退 `dailyTitleFallback`

日记的 `title` 可以省略，文章仍然必填。没有标题时按出现位置选择回退方式：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `dailyTitleFallback.detail` | 内置策略或 `{ template }` | `'date'` | 详情页：隐藏 H1 的文本、浏览器标题、面包屑、JSON-LD 与 Pagefind |
| `dailyTitleFallback.archive` | 内置策略或 `{ template }` | `'slug'` | 归档列表标题 |
| `dailyTitleFallback.feed` | 内置策略或 `{ template }` | `'date'` | 三份 RSS 的条目标题 |

每个值可以是 `'date'`（站点时区下的日期，`zh_CN` 显示为 `2026-10-21`）、`'slug'`（如 `2026/10/21-night`）、`'untitled'`（当前语言的「未命名」），或 `{ template: '...' }`。模板占位符只支持 `{date}`、`{slug}`、`{diary}`（即 `labels.diary`）、`{untitled}`；未知占位符或空模板会中断构建。

```ts
// src/config/site.ts
dailyTitleFallback: {
  detail: 'date',
  archive: { template: '{diary} · {date}' },
  feed: 'slug',
},
```

这些设置只对日记生效。首页是否显示日记标题由 `home.showTitles` 与 frontmatter `hideHomeTitle` 控制。

## 内容与资源

这一段处理不属于字段表的资源：关于页正文、正文图片放大与自定义 HTML 注入。

### 关于页正文

关于页正文不在配置里，写在当前内容根的 `spec/about.mdx`：

- 主题模式：`src/content/spec/about.mdx`。
- 内容模式：`<内容根>/spec/about.mdx`。

文件没有 frontmatter，`##` 小节会自动加上 ✦ 与锚点。文件缺失时构建直接失败：

```text
[daybook:content] src/content/spec/about.mdx
  找不到关于页正文，请新建该文件（Markdown/MDX，无需 frontmatter）。
```

关于页其余内容来自站点配置：`avatar`（留空显示手绘印章）、`author`（H1 与印章说明）、`since`（`est.` 年份）、`subtitle`（一句话，为空回退 `description`）。

### 图片放大

正文图片由 lightGallery v3 放大，样式与插件随 `src/scripts/gallery.ts` 按需加载：页面没有正文图片时不会引入这部分体积。只有正文 Markdown 图片（渲染为 `img.a-img`，且没有被链接包裹）会进入放大层。

lightGallery 采用 GPLv3 / 商业双许可，授权 key 走环境变量 `PUBLIC_LIGHTGALLERY_LICENSE_KEY`：

- 本地把 `.env.example` 复制为 `.env`，写入 `PUBLIC_LIGHTGALLERY_LICENSE_KEY=<你的 key>`。
- 不设置时回落到官方临时评估 key `0000-0000-000-0000`：功能全开，只在浏览器控制台输出一条 not-for-production 警告。
- 正式的 v3 key 以 `LIG` 开头；开源项目（GPLv3 兼容）可发邮件到 contact@lightgalleryjs.com 申请免费 key，闭源项目需购买商业授权。
- 字段类型与默认值在 `astro.config.ts` 的 `env.schema` 里声明，`src/scripts/gallery.ts` 通过 `astro:env/client` 读取，值在构建时内联进客户端脚本；修改 `.env` 后重启 dev server 或重新构建。

警告的处理见[排错的「图片放大控制台警告」](./troubleshooting.md#图片放大控制台警告)。

### 自定义 HTML 注入 `inject`

需要往所有页面插入自有 HTML（站点验证 `<meta>`、统计脚本、自定义 `<script>` / `<style>`）时用 `inject`：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `inject.headEnd` | `string` | `''` | 输出到每页 `</head>` 之前；为空不输出 |
| `inject.bodyEnd` | `string` | `''` | 输出到每页 `</body>` 之前；为空不输出 |

- 片段按原样输出（Astro `set:html`），**不做转义或清洗**。只放站点所有者自己维护的可信 HTML，不要拼接用户输入或第三方未审计内容。
- 站内跳转由 ClientRouter 接管，`bodyEnd` 里的 `<script>` 不会在每次跳转时重新执行；需要每次导航都运行的逻辑，请监听 `astro:page-load`（首次加载也会触发）。

## 订阅、SEO 与索引

这一段决定 RSS、SEO 元信息、sitemap、robots、分类/标签 URL 与搜索索引的范围。

### RSS `rss`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `rss.enabled` | `boolean` | `true` | 总开关；关闭后三份 feed 地址返回 404 文案 |
| `rss.default.enabled` | `boolean` | `true` | 是否输出 `/feed.xml` 的正常内容；关闭后该地址返回 404 文案 |
| `rss.default.scope` | `'all' \| 'diary' \| 'post'` | `'all'` | `/feed.xml` 的收录范围 |
| `rss.diary.enabled` | `boolean` | `true` | 是否输出 `/feed-diary.xml`（只含日记）；关闭后该地址返回 404 文案 |
| `rss.posts.enabled` | `boolean` | `true` | 是否输出 `/feed-posts.xml`（只含文章）；关闭后该地址返回 404 文案 |
| `rss.fullText` | `boolean` | `false` | `false` 输出摘要；`true` 输出渲染后的正文 HTML |
| `rss.limit` | `number` | `20` | 单份 feed 最多条目数，范围 1..200 |

- 草稿与 `hideFrom: [rss]` 的内容始终排除；密码内容只输出标题与 `description`，正文为固定提示。
- feed 按时间倒序，`pin` 不参与排序：置顶不会把旧内容顶到 feed 头部。
- `fullText: true` 只对 `.md` 内容生效；MDX 会回退摘要并输出一次 `[daybook:feed]` 警告。
- 相对链接会转成绝对链接，时间使用 `timezone`，`<language>` 跟随 `lang`。

### SEO 与 sitemap、robots

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `seo.ogImage` | `string` | `'/og-default.png'` | 全站默认 OG 图，当前所有页面都使用它。必须是 `/` 开头的 public 路径或 `http(s)` URL |
| `seo.twitterCard` | `string` | `'summary_large_image'` | 写入 `<meta name="twitter:card">` |
| `seo.locale` | `string` | 跟随 `lang` | `og:locale`；显式配置时优先 |
| `sitemap.enabled` | `boolean` | `true` | 是否输出 `sitemap.xml`；关闭后该地址返回 404 文案 |
| `sitemap.includeProtected` | `boolean` | `false` | 是否把密码保护页面纳入 sitemap |
| `robots.enabled` | `boolean` | `true` | 是否输出 `robots.txt`；关闭后该地址返回 404 文案 |
| `robots.disallow` | `string[]` | `[]` | 追加到 `Disallow` 的路径，每项以 `/` 开头 |

- 默认 OG 图由 `pnpm og` 生成到主题 `public/og-default.png`；内容模式用 `pnpm og:content` 生成到 `<内容根>/public/og-default.png`。生成后把图片提交到对应仓库。
- sitemap 收录固定页、分页、内容 URL、分类/标签页与独立页面；草稿、`hideFrom: [sitemap]` 与密码页（除非 `includeProtected: true`）排除。
- robots.txt 始终输出 `Allow: /`，并把所有密码页 URL 自动追加到 `Disallow`，末尾输出 `Sitemap:` 行。
- 关闭 feed / sitemap / robots 开关不会让路由消失：对应地址仍会写出一个 404 文案文件，只是不再是正常内容。
- 构建产物与宿主平台的对应关系见[部署](./deployment.md)。

### 分类与标签 slug `taxonomy`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `taxonomy.categories` | `Record<string, string>` | `{}` | 分类名到 URL slug 的映射 |
| `taxonomy.tags` | `Record<string, string>` | `{}` | 标签名到 URL slug 的映射 |

未配置映射时用 `encodeURIComponent(名称)` 生成 slug。名称含 `/`、`?`、`#` 时无法生成 URL，构建会要求提供映射；slug 不能为空，也不能包含 `/`、`?`、`#`。

```ts
// src/config/site.ts
taxonomy: {
  categories: { 读书笔记: 'books' },
  tags: { 'C++': 'cpp' },
},
```

### 搜索索引

搜索索引不通过 `site.ts` 配置，由构建生成：

- `pnpm build` 的 `postbuild` 运行 `pagefind --site dist`，索引输出到 `dist/pagefind/`；`pnpm build:content` 在构建命令里显式调用 pagefind。直接 `astro build` 不会生成索引。
- 只有详情页与独立页面带 `data-pagefind-body`；草稿与 `hideFrom: [search]` 的内容不索引；密码内容只索引标题与 `description`，密文正文不进索引。
- `pagefind.yml` 的 `exclude_selectors` 排除 KaTeX、搜索面板、TOC、评论与分页等区域。
- 开发服务器没有索引，本地验证搜索要 `pnpm build` 后运行 `pnpm preview`。

## 评论

评论区是客户端组件，是否渲染只看 `comments.enabled` 与 `provider`；各后端的服务端地址不是渲染门槛。

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `comments.enabled` | `boolean` | `true` | 评论总开关；`false` 时全站不渲染评论区 |
| `comments.provider` | `'twikoo' \| 'waline' \| 'artalk'` | `'twikoo'` | 评论系统；写其它值只输出 `[daybook:config]` 警告并隐藏评论区，不中断构建 |
| `comments.twikoo.envId` | `string` | `''` | Twikoo 环境 ID 或自建部署地址 |
| `comments.twikoo.region` | `string` | `''` | Twikoo 云开发地域；留空使用默认值 |
| `comments.twikoo.lang` | `string` | 跟随 `lang` | Twikoo 界面语言 |
| `comments.waline.serverURL` | `string` | `''` | Waline 服务端地址；不要带末尾斜杠，避免 API 路径出现 `//` |
| `comments.waline.lang` | `string` | 跟随 `lang`（`ja` → `jp`） | Waline 界面语言 |
| `comments.waline.login` | `'enable' \| 'disable' \| 'force'` | `'enable'` | 登录策略：允许匿名与登录 / 仅匿名 / 强制登录 |
| `comments.waline.pageSize` | `number` | `10` | 每页评论数，必须是正整数 |
| `comments.artalk.server` | `string` | `''` | Artalk 服务端地址 |
| `comments.artalk.site` | `string` | 站点 `title` | Artalk 站点名，必须与服务端 `site_name` 一致 |
| `comments.artalk.locale` | `string` | 跟随 `lang` | Artalk 界面语言 |
| `comments.artalk.pageSize` | `number` | `20` | 每页评论数，必须是正整数 |

```ts
// src/config/site.ts
comments: {
  enabled: true,
  provider: 'twikoo',
  twikoo: { envId: '你的 Twikoo 环境 ID' },
},
```

- 三个 SDK 都是本地依赖（`twikoo`、`@waline/client`、`artalk`），按 `provider` 懒加载，厂商 CSS 随评论岛内联。
- 服务端地址为空时评论区仍会渲染骨架并尝试初始化，组件不拦截空值；缺少配置的提示由评论系统自己给出。
- 单篇内容可以用 frontmatter `comments: false` 关闭；密码内容解锁后才加载评论。frontmatter 写法见[写作](./writing.md)。
- 仓库示例 `site.ts` 里 `comments.enabled: false`；要显示评论，先改成 `true` 并填写所选后端的配置。
- 本地联调 Artalk 的示例地址 `https://artalk.qwqaq.com` 时，如果它没有返回 CORS 头：先在本机起一个反向代理把该地址同源转发，再把 `artalk.server` 临时改成代理地址（如 `http://127.0.0.1:8080`）。这只用于联调，不要写进线上配置。

## MDX 增强 mdx

`mdx.meting` 是 MDX 里 Meting-API 客户端的站点级配置：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mdx.meting.api` | `string` | `'https://163.hyc.moe/'` | Meting-API 基础地址；必须是 `http(s)`，不能带查询参数或 hash |
| `mdx.meting.timeout` | `number` | `5000` | 单次请求超时（毫秒），必须是正整数 |
| `mdx.meting.cache.enabled` | `boolean` | `true` | 是否启用服务端构建缓存 |
| `mdx.meting.cache.ttl.playlist` | `number` | `86400000` | `playlist` 缓存时间（毫秒）；`0` 表示该类型不缓存 |
| `mdx.meting.cache.ttl.search` | `number` | `86400000` | `search` 缓存时间（毫秒） |
| `mdx.meting.cache.ttl.default` | `number` | `2592000000` | 其它类型的缓存时间（毫秒） |

- 这些值用于构建期请求（`fetchMusic()`、`meting.player({ client: false })`），同时输出到页面的 `data-meting-api` / `data-meting-timeout`；浏览器端播放器与 `@mdx/client` 直连 API，不读服务端缓存。
- `api` 写在子路径时保留末尾斜杠，例如 `https://example.com/meting/`。
- MDX 用法、查询参数与缓存行为见 [Meting API](./developers/meting-api.md)；缓存位置与失效方式见[「服务端缓存」](./developers/meting-api.md#服务端缓存)。

## 友链 links.ts

友链写在 [`src/config/links.ts`](../src/config/links.ts)，按分组展示：

```ts
// src/config/links.ts
import { defineLinksConfig } from './define';

export const linksConfig = defineLinksConfig({
  groups: [
    {
      name: '熟人',
      description: '一起写东西的朋友。',
      links: [
        {
          name: '纸飞机',
          url: 'https://example.com',
          avatar: '/images/avatar.png',
          description: '一个写日记的邻居。',
        },
      ],
    },
  ],
});
```

- `groups` 必填，可以是空数组。
- 分组：`name` 必填且非空；`description` 可选，默认 `''`；`links` 是数组，可以为空（空分组在页面上不渲染）。
- 友链：`name` 必填；`url` 必填，必须是合法 `http(s)` 地址且不能带查询参数或 hash；`avatar` 可选，`/` 开头的 public 路径或 `http(s)` URL；`description` 可选，默认 `''`。
- 校验失败同样输出 `[daybook:config]`，字段路径指向数组下标，例如 `groups[0].links[0].url`。内容模式的路径换成 `<内容根>/config/links.ts`。

## 校验失败

配置在模块加载阶段校验，任何一步失败都会中断 `astro dev` / `astro build`。错误固定两行：第一行是文件与字段路径，第二行是两个空格加原因。

```text
[daybook:config] src/config/site.ts > nav[1].link
  nope 不是合法内部链接（必须以 / 开头）
```

- `nav[1].link` 表示 `nav` 数组第 2 项的 `link`；`(root)` 表示整个对象不合法。
- 结构校验只报第一个 Zod issue：`Unrecognized key` 是字段名写错或写错文件，其余通常带具体路径。
- 配置层只校验链接格式；内链是否存在对应路由要到构建期才检查，报错前缀是 `[daybook:project]`（见[顶部导航 `nav`](#顶部导航-nav)）。
- 内容模式的配置错误把文件显示为相对主题仓库根的路径，例如 `content/config/site.ts`；实际路径随 `CONTENT_REPO` 变化。
- 不受支持的评论 `provider` 只是警告，不会中断构建。

常见错误：

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `Unrecognized key: "xxx"` | 字段名拼错，或字段写在了错误的文件里 | 对照本页字段表改回正确名称；`site.ts` 与 `links.ts` 的字段不能互换 |
| `nope 不是合法内部链接（必须以 / 开头）` | 站内链接没写前导 `/` | 改写成 `/posts` 这种形式 |
| `https://example.com/?a=1 不是合法的 http(s) 外链` | 外链带了查询参数或 hash | 去掉 `?query` / `#hash` |
| `非法 IANA 时区：Asia/Chongqing` | `timezone` 不是合法 IANA 名称 | 改成 `Asia/Shanghai`、`Asia/Tokyo`、`UTC` 等 |
| `since 必须在 1900..2027 之间` | `since` 超出范围（上限是当前时区年份 + 1） | 改成合理年份；上限随当前年份变化 |
| `url 只支持 http:// 或 https://` / `url 不能包含查询参数或 hash` | 站点 URL 不合规 | 用不带 query/hash 的 `http(s)` 地址 |
| `rss.limit 必须是正整数` | `rss.limit` 写成 0、负数或不是整数；上限 200 | 改成 1..200 的整数 |
| `pagination.daily 必须是正整数` | 分页数写成 0、负数或小数 | 改成正整数 |
| `未知占位符 {unknown}（可用：{date}、{slug}、{diary}、{untitled}）` | `dailyTitleFallback` 模板用了不支持的占位符 | 只使用列出的四个占位符；空模板同样会被拒绝 |
| `slug "books/2026" 不能为空或包含 / ? #` | `taxonomy` 的 slug 含 URL 非法字符 | 换成不含 `/`、`?`、`#` 的短 slug |
| `… 不是合法 http(s) URL`（字段路径形如 `groups[0].links[0].url`） | 友链地址不是合法 `http(s)` 地址或带了 query/hash | 改成规范地址 |

修改后重新运行命令验证。主题模式下 `url` 与 `lang` 在启动时被 `astro.config.ts` 读取，改完需要重启 `pnpm dev`；内容模式下配置文件的修改会触发 dev server 自动重启。逐步排查见[排错的「配置校验失败」](./troubleshooting.md#配置校验失败)。

## 安全边界

- **密码保护是静态分发下的轻量遮挡，不是服务端鉴权。** 正文在构建期用 AES-256-GCM 加密（PBKDF2-SHA256、150000 次迭代），密文随 HTML 公开；有能力的人可以离线暴力尝试。真正敏感的内容不要放进来。
- 密码内容的详情页输出 `noindex, nofollow`，默认不进 sitemap（`sitemap.includeProtected` 可打开）；Pagefind 只索引标题与 `description`。解锁状态不写入存储，刷新页面会重新上锁。
- MDX 内容不支持 `password`，写错会在构建期报错。可见性、草稿与密码的完整规则见[写作](./writing.md)。
- `inject.headEnd` / `inject.bodyEnd` 按原样写入页面，不做转义或清洗；只放站点所有者自己维护的可信 HTML。
- 不要把密钥写进 `src/config/site.ts`：客户端可见的值只走 `PUBLIC_` 前缀的环境变量（当前只有 `PUBLIC_LIGHTGALLERY_LICENSE_KEY`）。`.env` 已被忽略，不要提交。
- `CONTENT_REPO_URL` 可以内联 HTTP token，`CONTENT_REPO_SSH_KEY` 指向私钥路径；`content:clone` / `content:pull` 的失败日志会脱敏 URL 中的账号、token 与常见 query 参数，但不要把凭据贴进配置、文档或提交。
