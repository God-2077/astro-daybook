# 配置层导读（`src/config/`）

本站的站点级配置全部是**带类型的 TypeScript**，在模块加载阶段完成解析与校验：
写错字段会让 `astro dev` / `astro build` 直接失败，并指出具体文件与字段路径。

- 面向使用者的完整字段表、默认值与示例见 [`docs/configuration.md`](../../docs/configuration.md)。
- 本文件面向维护者，说明配置层的文件分工、解析链路与常见错误。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| [`site.ts`](./site.ts) | 站点主配置：标题、URL、作者与头像、构建语言、导航、内容称呼、分页、RSS、评论、MDX 增强（Meting）、SEO、sitemap、robots、版权、备案、自定义 HTML 注入。是唯一带完整默认值合并的配置文件。 |
| [`links.ts`](./links.ts) | 友链页配置：分组与组内友链。 |
| [`define.ts`](./define.ts) | 解析入口与语义校验：`defineSiteConfig` / `defineLinksConfig`，以及 `isCommentsRendered`、`isSupportedCommentProvider`。 |
| [`defaults.ts`](./defaults.ts) | 默认值：`LOCALE_DEFAULTS`（四语言的 `home` / `labels` / `nav` / `footerNav`）与 `defaultHome` / `defaultLabels` / `defaultNav` / `defaultFooterNav`、`DEFAULT_RSS`、`DEFAULT_COMMENTS`、`DEFAULT_INJECT`、`DEFAULT_MDX`、`DEFAULT_THEME` 等；受支持的评论 provider 白名单 `SUPPORTED_COMMENT_PROVIDERS` 也在这里。 |
| [`schema.ts`](./schema.ts) | Zod schema：只做结构与类型校验（未知字段直接拒绝，可见字段均带类型约束）。 |
| [`index.ts`](./index.ts) | 统一出口：re-export 两个配置对象、评论相关工具函数与 `src/types/config.ts` 中的全部类型。页面一般从 `../config/site` 等处直接引入，需要类型时从 `../types/config` 或 `../config` 引入。 |

类型定义单独放在 [`src/types/config.ts`](../types/config.ts)，schema 通过 `z.infer` 与之对齐。

使用独立内容仓库时，配置入口换成 `<内容根>/config/site.ts` 与 `links.ts`：这两个文件通过 `import type` 复用 [`src/types/config.ts`](../types/config.ts) 的 `SiteConfigInput` / `LinksConfigInput`，默认导出普通对象，由 `scripts/site-context.ts` 读取后交给本目录的 `defineSiteConfig` / `defineLinksConfig` 校验。`import type` 运行时会被擦除，内容仓库不需要主题依赖；主题的 `src/config/site.ts` / `links.ts` 在内容模式的构建中由 Vite 插件替换，页面代码不需要改 import；Node 单测仍读取主题文件。完整说明见 [`docs/dual-repo.md`](../../docs/dual-repo.md)。

## 解析链路

两个配置文件都走同一条链路：

```text
site.ts ──defineSiteConfig()──▶ parse (schema.ts / Zod) ──▶ resolve (defaults.ts 合并默认值) ──▶ validate (define.ts 语义校验) ──▶ 只读配置对象
links.ts ──defineLinksConfig()──▶ parse ──▶ resolve（补空数组） ──▶ validate ──▶ linksConfig
```

关于页的正文不在这里：它属于内容，放在当前内容根的 `spec/about.mdx`（主题模式为 `src/content/spec/about.mdx`），由页面用 `getEntry('specCollection', 'about')` 读取。

- **parse**：`strictObject` 会拒绝未知字段（拼错键名不会静默失效），类型错误会带上字段路径。
- **resolve**：`site.ts` 的用户值优先，缺省值来自 `defaults.ts`；部分字段还会互相推导，例如 `copyright.yearFrom` 取 `since`、`copyright.author` 取站点 `author`、`footerBrand` 取 `title`。
- **validate**：Zod 表达不了的语义约束，例如 IANA 时区、URL 协议与 query/hash、`since` 年份范围、导航链接、分页/RSS 正整数、`seo.ogImage`、`robots.disallow`、分类/标签 slug。
- **return**：返回补全后的配置对象。任何一步失败都抛出 `ConfigError`，页面代码不需要再做兜底判断。

### 新增字段的顺序

1. 在 [`src/types/config.ts`](../types/config.ts) 增加类型（输入类型与解析后类型）；
2. 在 [`schema.ts`](./schema.ts) 增加 `z.xxx().optional()`；
3. 在 [`defaults.ts`](./defaults.ts) 增加默认值（若与语言相关，放进 `LOCALE_DEFAULTS`）；
4. 在 [`define.ts`](./define.ts) 的 `resolveSite()` 中合并，并在需要时补 `validateSite()` 校验；
5. 如果新增的是主题 UI 文案，先在 [`src/i18n/locales/zh-CN.ts`](../i18n/locales/zh-CN.ts) 加 key，再同步 `en.ts` / `ja.ts` / `zh-TW.ts`；
6. 同步更新 [`docs/configuration.md`](../../docs/configuration.md) 与本文件。

## 导航配置怎么写

`nav` 是 `NavItem[]`，`NavItem` 有两种形状，只能嵌套一层：

```ts
// src/config/site.ts
nav: [
  { title: '日记', link: '/' }, // 一级链接
  {
    title: '文章', // 一级分组
    items: [
      { title: '全部文章', link: '/posts' },
      { title: '分类', link: '/categories' },
      { title: '标签', link: '/tags' },
      { title: '归档', link: '/archives' },
    ],
  },
  { title: '友链', link: '/friends' },
  { title: '关于', link: '/about' },
],
```

规则：

- 分组必须带非空 `items`，且只能有一层；不支持三级菜单。
- 站内链接必须以 `/` 开头，例如 `/posts`、`/archives`；不要写 `posts`。
- 外链必须以 `http://` 或 `https://` 开头，且不能带查询参数或 hash。
- `footerNav` 只接受一级链接 `{ title, link }[]`，规则同上；不写时按 `lang` 使用内置的归档、友链两项。页脚不会自动追加 RSS；需要时手动加入 `{ title: 'RSS', link: '/feed.xml' }`。
- 移动端底部导航默认首页、文章、友链、关于四项；用 `bottomNav.enabled` 控制显示，`bottomNav.items` 整体替换入口。标题优先取 `bottomNav.items[].title`，其次取 `nav` 中对应路径的一级链接或分组标题（`navLabelFor`，见 `src/lib/nav.ts`），未配置时回退到当前语言的内置文案。
- 内部链接是否命中真实路由需要自行保证（配置层只校验格式，不做路由存在性检查）；`bottomNav.items` 的站内链接例外，会在构建期检查路由。

## 底部导航与归档默认类型

```ts
// src/config/site.ts
bottomNav: {
  enabled: true,
  items: [
    { link: '/', title: '日记', icon: 'i-book' },
    { link: '/posts', title: '文章', icon: 'i-file' },
    { link: '/friends' },
    { link: '/about', icon: 'i-user' },
  ],
},
archive: {
  defaultType: 'diary',
},
```

- `bottomNav` 默认开启四项；`enabled: false` 关闭底栏并取消页面底部为它预留的空白。
- `items` 至少一项，整体替换默认入口；`title`、`icon` 可省略，`icon` 必须是 `src/assets/sprite.html` 中的 `i-*` id。
- `archive.defaultType` 只接受 `'articles'` 或 `'diary'`，默认 `'articles'`；设为 `'diary'` 时日记按钮在前且默认选中。

## 内容称呼怎么写

`labels.diary` 是站内对「日记」类内容的统一称呼，默认随 `lang` 变化（`zh_CN` 为 `'日记'`，`en` 为 `'Diary'`）：

```ts
// src/config/site.ts
labels: {
  diary: '日记', // 改成「随笔」后，置顶/加密提示、归档、搜索、RSS 等会一起变化
},
```

- 只影响内容称呼：详情页类型与面包屑、置顶/加密提示、归档、搜索文案、RSS 标题等。
- 不控制首页大标题（`home.title`），也不控制导航；底部导航标题优先取 `bottomNav.items[].title`，其次跟随 `nav`。
- 首页及分页页面的浏览器 `<title>` 使用 `labels.diary`，首页可见大标题仍用 `home.title`。
- `home.showTitles` 只控制首页日记条目是否显示标题；详情/归档/RSS 不受影响（无标题的日记仍用日期回退）。单篇日记可用 frontmatter `hideHomeTitle: true` 单独关闭自己的首页条目标题。
- 必须是必填的非空字符串（schema 层 `min(1)`）。
- 新增读取处时请用 `siteConfig.labels.diary`，不要再用 `home.title` 充当内容称呼。

## 构建语言怎么配

`site.ts` 的 `lang` 是**构建时**单语言选项，默认 `'zh_CN'`，支持 `'en'`、`'ja'`、`'zh_CN'`、`'zh_TW'`：

```ts
// src/config/site.ts
lang: 'zh_CN',
```

- 一次构建只输出一种语言，没有站内切换器、`/[lang]` 路由或 hreflang。
- `lang` 参与 `resolveSite()`：`home` / `labels` / `nav` / `footerNav` 的缺省值来自 `defaults.ts` 的 `LOCALE_DEFAULTS`；`bottomNav` 缺省为内置四项，标题按 `nav` 与当前语言推导；`comments.twikoo.lang`、`comments.waline.lang`、`comments.artalk.locale` 与 `seo.locale` 来自 `localePackages[lang].meta`，显式配置时仍优先。
- 主题 UI 文案在 [`src/i18n/locales/`](../i18n/locales/)：`zh-CN.ts` 是 key 的基准，`en.ts` / `ja.ts` / `zh-TW.ts` 用 `satisfies LocalePackage` 保证 key 齐全。新增文案时四套一起改，`pnpm check` 会检查缺 key。
- 日期格式、星期/月份名、复数字形与语言映射在各自的 `meta` / `counts` 中；`src/lib/content/date.ts` 只读 `localeMeta`。
- 客户端脚本的语言包由 `BaseLayout.astro` 通过 `define:vars` 注入 `window.__DAYBOOK_I18N__`，避免把 `siteConfig` / Zod 打进浏览器包；`src/scripts/client.ts` 只读该全局，不直接 import `current.ts`。
- 面向使用者的范围说明见 [`docs/configuration.md`](../../docs/configuration.md#构建语言-lang)。

## 主题模式怎么配

`theme` 控制站点默认外观：`'light'`（浅色）、`'dark'`（深色）或 `'system'`（跟随系统），默认 `'system'`：

```ts
// src/config/site.ts
theme: 'system',
```

- `light` / `dark`：本地没有用户偏好时，首次访问强制使用对应模式。
- `system`：跟随 `prefers-color-scheme`；系统主题变化时，页面会实时跟随。
- 抽屉底部提供「浅色 / 深色 / 自动」三个选项，用户手动选择会写入 `localStorage['daybook-theme']`，优先级高于 `theme`。
- `<html data-theme-mode>` 会输出配置值，供首屏内联脚本在样式加载前决定配色，避免闪烁。

## 自定义 HTML 注入怎么写

`inject` 是站点级原样输出，由 `BaseLayout.astro` 在 `</head>` 与 `</body>` 前各渲染一个片段：

```ts
// src/config/site.ts
inject: {
  headEnd: '<meta name="example-verify" content="..." />',
  bodyEnd: '<script src="/custom.js" defer></script>',
},
```

- `headEnd` / `bodyEnd` 对应 `BaseLayout.astro` 中 `<slot name="head" />`、`<slot name="bodyEnd" />` 之后的 `Fragment set:html`；未配置时默认 `''`，不输出节点。
- 内容不做转义或清洗，属于可信配置；不要把用户输入拼进来。
- 使用 ClientRouter 时，站内跳转不会重新执行 `bodyEnd` 中的 `<script>`；需要每次导航运行请监听 `astro:page-load`。
- 新增字段的链路与其它配置一致：`types/config.ts` → `schema.ts` → `defaults.ts`（`DEFAULT_INJECT`）→ `define.ts`。

## 评论配置怎么写

```ts
// src/config/site.ts
comments: {
  enabled: true, // 评论总开关，默认 true
  provider: 'twikoo', // 'twikoo' | 'waline' | 'artalk'
  twikoo: {
    envId: '你的 Twikoo 环境 ID', // 为空也照常初始化，由 Twikoo 自己提示配置问题
    region: '', // 留空使用 Twikoo 默认值
    // lang: 'zh-CN', // 省略时由站点 lang 推导
  },
  waline: {
    serverURL: 'https://waline.example.com', // 不要带末尾斜杠
    login: 'enable', // 'enable' | 'disable' | 'force'
    pageSize: 10,
    // lang: 'zh-CN', // 省略时由站点 lang 推导；ja 会映射为 'jp'
  },
  artalk: {
    server: 'https://artalk.example.com',
    site: '站点名', // 必须与服务端 site_name 一致；省略时回退站点标题
    pageSize: 20,
    // locale: 'zh-CN', // 省略时由站点 lang 推导
  },
},
```

行为约定：

- **是否渲染评论区** = `comments.enabled && provider 受支持`（受支持列表见 `defaults.ts` 的 `SUPPORTED_COMMENT_PROVIDERS`）；
  各后端的服务端地址不是渲染门槛。
- `provider` 不受支持时：`validateSite()` 输出一条 `[daybook:config]` 开头的 `console.warn`，页面隐藏评论区，**不会**中断构建。
- 服务端地址为空时：评论区照常渲染并尝试初始化对应系统，组件不检查、不拦截空值；缺少配置的提示由评论系统自己给出。
- 三个 SDK 都固定为本地依赖（`twikoo`、`@waline/client`、`artalk`），`Comments.tsx` 按 provider 懒加载，厂商 CSS 随评论岛内联，不依赖第三方 CDN，站内跳转后样式不会丢失。
- 单篇内容仍可用 frontmatter `comments: false` 关闭；密码保护内容解锁后才加载评论。
- 本地测试 Artalk demo（`https://artalk.qwqaq.com`）时需经本地反向代理转发，做法见 [`docs/configuration.md`](../../docs/configuration.md#评论)。

## 常见错误（ConfigError）

错误格式固定为两行：第一行是文件与字段路径，第二行是原因。

```text
[daybook:config] src/config/site.ts > nav[1].link
  nope 不是合法内部链接（必须以 / 开头）
```

```text
[daybook:config] src/config/site.ts > timezone
  Asia/Chongqing 不是有效的 IANA 时区
```

```text
[daybook:config] src/config/links.ts > groups[0].links[0].url
  https://example.com/?a=1 不是合法 http(s) URL
```

```text
[daybook:config] src/config/site.ts > since
  since 必须在 1900..2027 之间
```

```text
[daybook:config] src/config/site.ts > foo
  Unrecognized key: "foo"
```

排查建议：

- 先按第一行的 `文件 > 字段路径` 定位（`nav[1].link` 表示 `nav` 数组第 2 项的 `link`）；`(root)` 表示整个对象不合法。
- `Unrecognized key` 通常是把字段拼错或写到了错误的配置文件（例如把 `about` 的字段写进 `site.ts`）。
- 时区、`since`、URL、分页数量等报错都属于 `validate` 阶段，字段本身类型没错，但取值不合法。
- 评论 provider 不支持只是警告，不会出现在 `ConfigError` 中。

## 与 `docs/configuration.md` 的关系

- [`docs/configuration.md`](../../docs/configuration.md)：面向使用者的配置手册——每个字段的类型、可选值、默认值、示例与注意事项。
- 本文件：面向维护者的实现导读——文件分工、解析链路、扩展步骤与错误排查。

两者应同步维护：新增或修改字段时，同时更新 `docs/configuration.md` 与本文件中的相关说明。
