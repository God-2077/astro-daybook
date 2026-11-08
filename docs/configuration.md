# 配置说明

配置是 TypeScript，位于 `src/config/`：

| 文件 | 内容 |
| --- | --- |
| `site.ts` | 站点、导航、内容称呼、分页、RSS、评论、SEO、sitemap、robots、版权、备案、作者头像 |
| `links.ts` | 友链分组 |
| `index.ts` | 统一导出 |
| `define.ts` | 默认值合并、Zod 校验、语义校验 |
| `defaults.ts` | 默认值 |
| `schema.ts` | Zod schema |
| `README.md` | 配置层导读（解析链路、扩展步骤、错误排查） |
| `src/types/config.ts` | 公开类型 |

只写需要覆盖默认值的字段；所有字段都有 TypeScript 类型与运行期校验。

如果使用独立内容仓库（`pnpm dev:content` / `pnpm build:content`），站点配置改从 `<内容根>/config/site.ts` 与 `<内容根>/config/links.ts` 读取，字段表与校验规则不变；内容仓库配置的写法见 [`dual-repo.md`](dual-repo.md#内容仓库配置)。

维护者视角的解析链路与错误格式见 [`src/config/README.md`](../src/config/README.md)。

## `site.ts`

```ts
import { defineSiteConfig } from './define';

export const siteConfig = defineSiteConfig({
  title: "Ksable's 小屋",
  url: 'https://daybook.example.com',
  author: 'kissablecho',
  avatar: '/avatar.svg', // public 路径或 http(s) URL；留空显示手绘印章
  lang: 'zh_CN',
  timezone: 'Asia/Shanghai',
  theme: 'system',
  home: { title: '日记', subtitle: '一篇一篇，日子就有了形状。', showTitles: true },
  labels: { diary: '日记' },
});
```

### 字段

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 必填 | 站点标题、品牌名 |
| `subtitle` | `string` | `''` | 站点副标题 |
| `footerBrand` | `string` | 回退 `title` | 页脚品牌名 |
| `description` | `string` | `''` | 长描述，写入 meta/OG |
| `url` | `string` | 必填 | 站点 URL，不能带 query/hash，末尾 `/` 会规范化 |
| `author` | `string` | 必填 | 作者 |
| `avatar` | `string` | `''` | 关于页头像：站内 `/` 开头的 public 路径（可用 `.svg`、`.png` 等）或 http(s) URL；留空则显示默认的手绘印章 |
| `lang` | `'en' \| 'ja' \| 'zh_CN' \| 'zh_TW'` | `'zh_CN'` | 构建语言；一次构建只输出一种语言，站内不能切换 |
| `keywords` | `string[]` | `[]` | SEO 关键词 |
| `timezone` | `string` | `Asia/Shanghai` | IANA 时区；日期展示、RSS、sitemap 使用 |
| `since` | `number` | 当前时区年份 | 建站年份 |
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | 默认主题；`system` 跟随 `prefers-color-scheme`，用户手动选择优先 |
| `home` | `{ title, subtitle, showTitles }` | 按 `lang` 内置 | 首页可见大标题与副标题；`showTitles: false` 只关闭首页日记条目的标题，详情/归档/RSS 仍按原规则显示标题（无标题时用日期回退）。只控制首页（含首页分页）的 H1，不决定内容称呼或浏览器标题。单篇日记可用 frontmatter `hideHomeTitle: true` 单独关闭自己的首页条目标题 |
| `labels` | `{ diary }` | 按 `lang` 内置 | 站内「日记」类内容的称呼：详情页类型/面包屑、置顶/加密提示、归档、搜索、RSS、首页 `<title>` 等；可与首页标题不同 |
| `mdx.meting.api` | `string` | `https://163.hyc.moe/` | MDX 里 `meting.fetchMusic()` / `meting.player()` / `@mdx/client` 使用的 Meting-API 地址；必须是 http(s) URL，不能带 query/hash |
| `mdx.meting.timeout` | `number` | `5000` | Meting 请求超时时间（毫秒），必须是正整数；构建期与浏览器客户端共用 |
| `mdx.meting.cache.enabled` | `boolean` | `true` | 是否启用服务端构建缓存 |
| `mdx.meting.cache.ttl.playlist` | `number` | `86400000` | `playlist` 缓存时间（毫秒），默认 1 天 |
| `mdx.meting.cache.ttl.search` | `number` | `86400000` | `search` 缓存时间（毫秒），默认 1 天 |
| `mdx.meting.cache.ttl.default` | `number` | `2592000000` | 其它类型缓存时间（毫秒），默认 30 天 |
| `nav` | `NavItem[]` | 按 `lang` 内置 | 顶部导航 |
| `footerNav` | `{ title, link }[]` | 按 `lang` 内置（归档、友链） | 页脚导航（只能一级）；不会自动追加 RSS |
| `bottomNav` | `{ enabled, items }` | `enabled: true`、内置四项 | 移动端底部导航；可关闭或整体替换入口 |
| `copyright` | `{ enabled, yearFrom, author }` | `yearFrom` 当前年、`author` 取 `author` | 页脚版权 |
| `icp` | `{ text, link? }[]` | `[]` | 备案号，可多个 |
| `pagination.daily` | `number` | `20` | 首页每页日记数 |
| `pagination.post` | `number` | `20` | 文章列表每页文章数 |
| `archive` | `{ defaultType }` | `{ defaultType: 'articles' }` | 归档页默认类型；`'diary'` 时日记在前并默认选中 |
| `rss` | `RssConfig` | 见下 | RSS |
| `comments` | `CommentsConfig` | 见下 | 评论 |
| `seo` | `SeoConfig` | 见下 | OG/Twitter |
| `sitemap` | `SitemapConfig` | `{ enabled: true, includeProtected: false }` | sitemap |
| `robots` | `RobotsConfig` | `{ enabled: true, disallow: [] }` | robots.txt |
| `taxonomy` | `TaxonomyConfig` | `{ categories: {}, tags: {} }` | 分类/标签 slug 映射 |
| `inject` | `{ headEnd, bodyEnd }` | `{ headEnd: '', bodyEnd: '' }` | 全站自定义 HTML 注入；原样输出，只放可信 HTML |

### 导航 `NavItem`

```ts
type NavItem =
  | { title: string; link: string }
  | { title: string; items: { title: string; link: string }[] };
```

- `items` 只能一层二级。
- 外链必须以 `http://` 或 `https://` 开头；host 与 `siteConfig.url` 不同的链接自动带 `target="_blank" rel="noopener"`，同 host 的绝对地址按站内链接处理。
- 内部链接必须以 `/` 开头；是否命中真实路由需要自行保证（配置层只校验格式，不做路由存在性检查）。
- 二级菜单在移动端抽屉中折叠展示。
- 当前项按路径前缀高亮；移动端抽屉会在当前项后显示 `✦`。
- 移动端底部导航默认显示首页、文章、友链、关于四个入口；可用 `bottomNav.items` 整体替换，详见下方「移动端底部导航」。

### 移动端底部导航 `bottomNav`

```ts
bottomNav: {
  enabled: true,
  items: [
    { link: '/', title: '日记', icon: 'i-book' },
    { link: '/posts', title: '文章', icon: 'i-file' },
    { link: '/friends' },
    { link: '/about', icon: 'i-user' },
  ],
},
```

- 只在视口宽度 `<= 1023px` 时显示；桌面端不渲染，也不影响桌面布局。
- `enabled: false` 时不输出底栏，并取消页面为底栏预留的底部空白。
- `items` 至少一项，整体替换内置四项，不追加。`link` 必填；`title` 省略时依次取 `nav` 对应标题、内置文案，最后回退到链接本身；`icon` 省略时按内置链接映射，外链回退 `i-external`。
- `icon` 必须形如 `i-*`，对应 `src/assets/sprite.html` 中的 symbol id；写错不会中断构建，但图标为空。
- 内链规则与 `nav` 相同；外链自动新窗口打开。底部导航内的站内链接会在构建期检查路由是否存在。

### 内容称呼 `labels`

```ts
labels: {
  diary: '日记', // 可改成「随笔」「手记」等任意非空文本
},
```

只影响站内对「日记」类内容的称呼，不改变路由、分类或首页大标题。首页可见大标题仍由 `home.title` 控制；首页及分页页面的浏览器 `<title>` 使用 `labels.diary`；底部导航标题优先取 `bottomNav.items[].title`，其次跟随 `nav`。空字符串会被配置层拒绝。

### MDX 增强 `mdx`

```ts
mdx: {
  meting: {
    api: 'https://163.hyc.moe/', // 推荐自部署
    timeout: 5000,
    cache: {
      enabled: true,
      ttl: {
        playlist: 86_400_000, // 1 天
        search: 86_400_000, // 1 天
        default: 2_592_000_000, // 30 天
      },
    },
  },
},
```

- 供 MDX 里的 `import { meting } from '@mdx'` 与浏览器端的 `@mdx/client` 使用，详细用法与接口覆盖见 [`meting.md`](./meting.md)。
- `api` 必须是 http(s) URL，不能带 query/hash；末尾斜杠会原样保留，自部署在子路径下时写成 `https://example.com/meting/`。
- `timeout` 约束构建期请求；`meting.player({ client: true })` 会在浏览器里使用同一超时值。
- `cache` 只作用于服务端构建：`playlist` / `search` 默认短期缓存，其它类型默认长期缓存；`url` / `pic` 也按 `default` 缓存，需要更新时使用 `refresh: true`。
- 所有字段都可省略，默认值如上；在内容仓库模式下同样写在 `<内容根>/config/site.ts` 中。

### 构建语言 `lang`

```ts
lang: 'zh_CN', // 'en' | 'ja' | 'zh_CN' | 'zh_TW'
```

这是**构建时**选项：一次 `pnpm build` 只输出一种语言，站内没有语言切换器，也不会生成 `/[lang]` 路由或 hreflang。要换语言，修改 `lang` 后重新构建即可。

- 主题 UI 会跟随语言：导航默认文案、页面标题、空状态、按钮、分页、搜索面板、密码页、日期/星期/月份格式、RSS `<language>`、`<html lang>`、OG `og:locale`、JSON-LD `inLanguage`、Twikoo 界面语言等。
- `home`、`labels`、`nav`、`footerNav` 省略时，会使用当前语言的内置默认值；`bottomNav` 省略时使用内置四项入口，标题按当前语言推导。显式配置的值不会被翻译。
- `seo.locale` 与 `comments.twikoo.lang` 省略时由 `lang` 推导，仍可单独覆盖。
- 正文、`siteConfig.title` / `subtitle` / `description`、`src/content/spec/about.mdx`、`links.ts` 以及分类/标签名称都属于**内容**，不会自动翻译；需要其他语言时请自行准备对应内容。
- 支持值与映射：

| `lang` | `<html lang>` | `og:locale` | Twikoo |
| --- | --- | --- | --- |
| `en` | `en` | `en_US` | `en` |
| `ja` | `ja` | `ja_JP` | `ja` |
| `zh_CN` | `zh-CN` | `zh_CN` | `zh-CN` |
| `zh_TW` | `zh-TW` | `zh_TW` | `zh-TW` |

### 主题模式 `theme`

```ts
theme: 'system', // 'light' | 'dark' | 'system'
```

- `light` / `dark`：本地没有用户偏好时，首次访问强制使用浅色或深色。
- `system`：跟随 `prefers-color-scheme`；系统主题变化时实时跟随。
- 抽屉底部提供「浅色 / 深色 / 自动」三个选项，用户手动选择会写入 `localStorage['daybook-theme']`，优先级高于 `theme`。
- 首屏内联脚本会在样式加载前应用主题，`<meta name="theme-color">` 同步更新，避免闪烁。

### 分页

`pagination.daily` / `pagination.post` 必须为正整数。第一页是 `/` 或 `/posts`，不是 `/page/1`；越界返回 404。

### 归档页默认类型 `archive`

```ts
archive: {
  defaultType: 'diary', // 'articles' | 'diary'
},
```

- 默认 `'articles'`。
- 设为 `'diary'` 时，归档页默认选中日记，日记按钮排在文章按钮之前，统计与热力图也按日记显示。
- 只改变默认选中项与按钮顺序；两组条目内部仍按日期从新到旧排序。
- 默认状态由服务端直接输出，禁用 JavaScript 时也正确。

### RSS

```ts
rss: {
  enabled: true,
  default: { enabled: true, scope: 'all' }, // all | diary | post
  diary: { enabled: true },
  posts: { enabled: true },
  fullText: false,
  limit: 20,
}
```

- `enabled` 是总开关；子开关关闭时对应 endpoint 不生成。
- 草稿、`hideFrom: [rss]` 排除。
- 密码内容输出标题与 `description`，正文为固定提示。
- `fullText: false` 输出摘要；`true` 输出渲染后的正文 HTML。
- 相对链接会转为绝对链接；时间使用 `timezone`。

### 评论

```ts
comments: {
  enabled: true,
  provider: 'twikoo',
  twikoo: { envId: '', region: '' },
  waline: { serverURL: '', login: 'enable', pageSize: 10 },
  artalk: { server: '', site: '站点名', pageSize: 20 },
},
```

`enabled: false` 或 `provider` 不受支持时不渲染评论区；三个后端的服务地址为空时评论区仍会渲染骨架并尝试初始化，组件不检查、也不拦截空值，缺少服务端配置的提示由对应评论系统自己给出。单篇内容可用 frontmatter `comments: false` 关闭；密码页解锁后才加载评论。

`provider` 可选 `twikoo` / `waline` / `artalk`（受支持列表见 `src/config/defaults.ts` 的 `SUPPORTED_COMMENT_PROVIDERS`）。填了不支持的 provider 时只输出 `console.warn` 并隐藏评论区，不会中断构建。三个 SDK 都固定安装为本地依赖（`twikoo`、`@waline/client`、`artalk`），按 provider 懒加载；厂商 CSS 随评论岛内联，站内跳转后不会丢失；`path` / `pageKey` 使用 `window.location.pathname`，每次进入新页面都会重新初始化。

- `twikoo.envId` / `twikoo.region`：Twikoo 环境 ID 与云开发地域；`region` 留空使用默认值。
- `waline.serverURL`：Waline 服务端地址，**不要带末尾斜杠**，避免 API 路径出现 `//`。
- `waline.login`：`'enable'`（默认，允许匿名与登录）、`'disable'`（仅匿名）、`'force'`（强制登录）。
- `waline.pageSize`：每页评论数，默认 `10`。
- `artalk.server`：Artalk 服务端地址；`artalk.site` 必须与服务端 `site_name` 一致，省略时回退站点标题。
- `artalk.pageSize`：每页评论数，默认 `20`。
- 语言：`twikoo.lang` / `waline.lang` / `artalk.locale` 省略时由站点 `lang` 推导；Waline 的日文代码是 `jp`（不是 `ja`），本仓库已自动映射。
- 本地测试 Artalk demo 时，`https://artalk.qwqaq.com` 未返回 CORS 头，需要先起一个本地反向代理（把该地址同源转发到本机端口），再把 `artalk.server` 临时改为 `http://127.0.0.1:8080`。

### SEO / sitemap / robots

```ts
seo: { ogImage: '/og-default.png', twitterCard: 'summary_large_image', locale: 'zh_CN' },
sitemap: { enabled: true, includeProtected: false },
robots: { enabled: true, disallow: [] },
```

- `seo.ogImage` 是默认 OG 图；文章/日记没有独立图片时使用。
- 默认图由 `pnpm og` 生成到主题 `public/og-default.png`；内容模式用 `pnpm og:content` 生成到 `<内容根>/public/og-default.png`。生成后把图片提交到对应仓库。
- `seo.locale` 是 `og:locale`，省略时由 `lang` 推导（`zh_CN` → `zh_CN`、`en` → `en_US`）；需要时仍可显式覆盖。
- `sitemap.includeProtected` 为 `true` 时密码页也进 sitemap；默认排除。
- `robots.disallow` 追加到 `Disallow`；密码页 URL 会自动追加，`Allow: /` 始终输出。

### 分类/标签 slug 映射

名称含 `/`、`?`、`#` 等 URL 非法字符时，构建会要求提供映射：

```ts
taxonomy: {
  categories: { 读书笔记: 'books' },
  tags: { 'C++': 'cpp' },
},
```

未配置映射时使用 `encodeURIComponent(name)`。

### 自定义 HTML 注入 `inject`

需要往所有页面末尾插入自有 HTML（站点验证 `<meta>`、统计脚本、自定义 `<script>` / `<style>`）时：

```ts
inject: {
  headEnd: '<meta name="example-verify" content="..." />',
  bodyEnd: '<script src="/custom.js" defer></script>',
},
```

- `headEnd` 输出在每页 `</head>` 之前，`bodyEnd` 输出在每页 `</body>` 之前；所有使用 `BaseLayout` 的页面（含 404）都会带上。
- 片段按原样输出（Astro `set:html`），**不做转义或清洗**。只放站点所有者自己写的可信 HTML，不要拼接用户输入或第三方未审计内容。
- 在布局模板中，注入位置在页面级插槽（`<slot name="head">` / `<slot name="bodyEnd">`）之后；构建时 Astro 仍可能在其后追加自身的样式与模块脚本，因此 `headEnd` 不保证是 `<head>` 的最后一个节点。
- 站内跳转由 ClientRouter（View Transitions）接管，`bodyEnd` 里的 `<script>` 不会在每次跳转时重新执行；需要每次导航都运行的逻辑，请监听 `astro:page-load`（首次加载也会触发）。
- 两个字段默认都是空字符串，为空时不输出任何节点；不配置 `inject` 与配置空串等价。

## 关于页正文

关于页没有单独的配置文件：正文写在当前内容根的 `spec/about.mdx`（主题模式为 `src/content/spec/about.mdx`，内容模式为 `<内容根>/spec/about.mdx`；无 frontmatter，`##` 小节自动带 ✦ 与锚点），由页面在构建期读取；文件缺失时构建直接失败并提示路径。头像、标题与副标题分别来自 `site.ts` 的 `avatar`、`author`、`subtitle`。

目录结构、frontmatter 与可见性规则见 [`content.md`](content.md)。

## `links.ts`

```ts
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
          avatar: '/images/avatar.png', // 或 https URL，可省略
          description: '一个写日记的邻居。',
        },
      ],
    },
  ],
});
```

`url` 必须是 http(s)；`avatar` 可以是站内 `/` 路径或 http(s) URL。

## 图片放大

正文图片由 [lightGallery](https://www.lightgalleryjs.com/) v3 放大，样式与插件（`zoom` / `thumbnail` / `fullscreen` / `autoplay`）都随 `src/scripts/gallery.ts` 按需加载：页面没有正文图片时不会引入这部分体积。

lightGallery 采用 GPLv3 / 商业双许可，授权 key 走环境变量 `PUBLIC_LIGHTGALLERY_LICENSE_KEY`：

- 本地在项目根目录建 `.env`（可从 `.env.example` 复制），写入 `PUBLIC_LIGHTGALLERY_LICENSE_KEY=<你的 key>`；
- 不设置时构建回落到官方临时评估 key `0000-0000-000-0000`：功能全开，只在浏览器控制台留一条 not-for-production 警告；
- 开源项目（GPLv3 兼容）可发邮件到 contact@lightgalleryjs.com 申请免费 key，闭源项目需购买商业授权，正式 key 以 `LIG` 开头。

环境变量的类型与默认值在 `astro.config.ts` 的 `env.schema` 里声明，`src/scripts/gallery.ts` 通过 `astro:env/client` 读取（构建时就地内联，客户端拿不到其它环境变量）。

## 部署

产物是 `dist/` 里的纯静态文件，可部署到任意静态托管（Vercel、Cloudflare Pages、Netlify、GitHub Pages、对象存储 + CDN 等）：

```bash
pnpm build      # 输出 dist/
```

- 构建前把 `siteConfig.url` 改成真实域名：它参与 canonical、RSS、sitemap 与 OG 的绝对链接。
- 托管平台需要填构建命令与输出目录时：命令 `pnpm build`，输出目录 `dist`。
- 内容模式部署时构建命令改为 `pnpm build:content`；它会先生成内容站点，再建立 Pagefind 索引。需要把内容仓库一起检出时，按托管平台的文档配置 `CONTENT_REPO` 或改用把内容放进主题仓库的方式，详见 [`dual-repo.md`](dual-repo.md)。以 Vercel 为例的完整自动化流程（Fork 两个仓库、环境变量、Deploy Hook、内容仓库 GitHub Action）见 [`deployment-vercel.md`](deployment-vercel.md)。
- 搜索索引由 `postbuild` 生成到 `dist/pagefind/`，所以要用 `pnpm build` 而不是直接 `astro build`，否则搜索不可用。
- 本站默认部署在根路径 `/`。若必须放在子路径，需要同时调整 Astro 的 `base`、`trailingSlash` 以及 RSS / Pagefind 的资源路径，改动面较大，先确认是否真的需要。
- `feed.xml`、`sitemap.xml`、`robots.txt` 由静态 endpoint 生成；在 `site.ts` 里关闭对应开关后，产物会一并消失。
- 评论依赖所选后端自己的服务地址；未配置时不影响其余页面，也不会显示错误提示。

## 安全边界

- 密码保护是**静态分发下的轻量遮挡**，不是服务端鉴权。密文随 HTML 公开，拥有足够动机的人可以离线暴力尝试；真正敏感的内容应使用服务端鉴权。
- 错误密码只提示「密码错误」，不会泄露明文片段。
- 配置与正文中的站外链接会加 `target="_blank" rel="noopener"`；Markdown 默认按 Astro 的安全策略处理原始 HTML。
- `inject.headEnd` / `inject.bodyEnd` 按原样写入页面，不做转义或清洗；只用于站点所有者自己维护的可信 HTML。
- Pagefind 只对密码页的标题与 `description` 建索引；被锁定的内容、`hideFrom` 含 `sitemap` 的条目、草稿与 404 页输出 `noindex`，密码页默认不进 sitemap。
- `.env` 里的 `CONTENT_REPO_URL` 可能内联 HTTP token，`CONTENT_REPO_SSH_KEY` 指向私钥；不要提交 `.env` 或把凭据写进配置/文档。`content:clone` / `content:pull` 的失败日志会脱敏 URL 中的账号、token 与常见 query 参数。
- 示例歌单的音频、封面与歌词托管在外部 CDN（地址见 `src/content/pages/music.mdx`），仓库不含这些文件；曲目版权归各自权利人，正式使用前请替换成自己的资源。

## 校验失败

配置错误会在 `astro dev` / `astro build` 的模块加载阶段抛出，格式：

```text
[daybook:config] src/config/site.ts > nav[1].link
  nope 不是合法内部链接（必须以 / 开头）
```

内容模式的配置错误会把文件路径显示为 `content/config/site.ts` 或 `content/config/links.ts`（实际路径随 `CONTENT_REPO` 变化）。

常见错误：

- 未知字段拼写错误（`Unrecognized key: "xxx"`）
- 缺少 `title` / `url` / `author`
- `lang` 不是 `en`、`ja`、`zh_CN`、`zh_TW` 之一
- 非法 IANA 时区
- 非法 URL、带 query/hash
- 内部导航链接不是以 `/` 开头，或外链不是合法 http(s) URL
- 分页不是正整数、`rss.limit` 超出 1..200
- `taxonomy` 名称为空，或 slug 含 `/`、`?`、`#`
- 内容 `permalink` 冲突（见 `docs/content.md`）
