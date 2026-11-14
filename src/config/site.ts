import { defineSiteConfig } from './define';

/**
 * 站点主配置：站名、域名、导航、分页、RSS、评论、SEO、sitemap、robots、版权与备案。
 *
 * 只写需要覆盖默认值的字段即可，未写的字段由 `defaults.ts` 兜底；
 * 本文件通过 `defineSiteConfig()` 依次经过
 * parse（Zod 结构校验）→ resolve（合并默认值）→ validate（语义校验），
 * 字段写错时 `astro dev` / `astro build` 会直接失败并指出字段路径。
 *
 * 完整字段说明见 `docs/configuration.md`，配置层导读见 `src/config/README.md`。
 */
export const siteConfig = defineSiteConfig({
  /**
   * 站点标题（必填）。
   *
   * - 用途：浏览器标签页、导航品牌名、RSS 标题、OG 站点名，以及 `footerBrand` 的缺省值。
   * - 可选值：任意非空字符串。
   * - 注意：修改后所有页面的标题后缀会同步变化。
   */
  title: 'Daybook',

  /**
   * 站点副标题（可选）。
   *
   * - 用途：首页等页面在大标题下方的短句；也为 `home.subtitle` 缺省时的回退值。
   * - 可选值：任意字符串；默认 `''`。
   */
  subtitle: '写点日记，也写点长文。',

  /**
   * 站点公开 URL（必填）。
   *
   * - 用途：生成 canonical、OG、RSS、sitemap 与站内绝对链接。
   * - 可选值：带 `http://` 或 `https://` 的完整地址；不能带查询参数或 hash。
   * - 注意：末尾的 `/` 会被自动去掉；部署前必须改成真实域名（此处为示例域名）。
   */
  url: 'https://daybook.demo.ksable.top',

  /**
   * 作者名（必填）。
   *
   * - 用途：RSS/OG 作者信息、版权声明的缺省作者（`copyright.author`）。
   * - 可选值：任意非空字符串。
   */
  author: 'kissablecho',

  /**
   * 作者头像（可选）。
   *
   * - 用途：关于页左栏头像；未配置时回退为页面内置的手绘字母印章。
   * - 可选值：以 `/` 开头的 public 路径（如 `'/avatar.svg'`、`'/avatar.png'`），或 `http(s)://` URL。
   * - 默认：`''`（使用手绘印章）。
   * - 注意：图片按 1:1 圆形裁切显示，建议用正方形图；SVG 通过 `<img>` 引入，
   *   因此不能继承主题色，也不支持 `currentColor`。
   */
  avatar: '/avatar.svg',

  /**
   * 构建语言（可选）。
   *
   * - 可选值：`'en'`、`'ja'`、`'zh_CN'`、`'zh_TW'`；默认 `'zh_CN'`。
   * - 作用：决定主题 UI、日期格式、`<html lang>`、OG locale、RSS language 与 Twikoo 界面语言；
   *   未显式配置的 `home` / `labels` / `nav` / `footerNav` 也会跟随此语言使用内置文案。
   * - 注意：这是**构建时**选项。一次构建只输出一种语言，站内没有语言切换器，
   *   也不生成 `/[lang]` 路由；切换语言需要修改这里后重新构建。
   * - 范围：正文、站点标题/描述、`src/content/spec/about.mdx`、`links.ts` 与分类/标签名称属于内容，不会被自动翻译。
   */
  lang: 'zh_CN',

  /**
   * 站点长描述（可选）。
   *
   * - 用途：首页与列表页的 `<meta name="description">` / OG 描述，也是 `home.subtitle` 的回退值。
   * - 可选值：任意字符串；默认 `''`。
   * - 注意：建议控制在 120 字以内，避免搜索结果被截断。
   */
  description: 'Daybook：一个基于 Astro 构建的静态博客，以日记为主、技术文章为辅。',

  /**
   * SEO 关键词（可选）。
   *
   * - 用途：写入 `<meta name="keywords">`，对主流搜索引擎权重有限，仅作补充。
   * - 可选值：`string[]`；默认 `[]`。
   */
  keywords: ['日记', '博客', 'Astro', '前端', '碎碎念', 'Daybook'],

  /**
   * IANA 时区（可选）。
   *
   * - 用途：日期展示、RSS 时间、sitemap `lastmod`、`since` 缺省年份都按此时区计算。
   * - 可选值：合法 IANA 时区名，如 `'Asia/Shanghai'`、`'UTC'`；默认 `'Asia/Shanghai'`。
   * - 注意：与构建机器的本地时区无关；非法值会直接报错。
   */
  timezone: 'Asia/Shanghai',

  /**
   * 建站年份（可选）。
   *
   * - 用途：页脚版权起始年份（`copyright.yearFrom` 的缺省值）、归档页的起始提示。
   * - 可选值：`1900` 到「当前时区年份 + 1」之间的整数；默认当前年份。
   */
  since: 2026,

  /**
   * 默认主题偏好（可选）。
   *
   * - 可选值：`'light'`（浅色）、`'dark'`（深色）、`'system'`（跟随系统）。
   * - 默认：`'system'`，按 `prefers-color-scheme` 自动选择。
   * - 注意：这里只作为首次访问的默认值；用户在抽屉里手动选择后会写入
   *   `localStorage['daybook-theme']` 并优先于该配置。
   */
  theme: 'light',

  /**
   * 首页大标题、副标题与标题显示开关（可选）。
   *
   * - 字段：`title`（可选，非空字符串）、`subtitle`（可选，可为空）、`showTitles`（可选，默认 true）。
   * - 默认：按 `lang` 使用内置文案（`zh_CN` 为「日记 / 一篇一篇，日子就有了形状。」）。
   * - 注意：`subtitle` 为空时页面会回退到站点副标题/描述。
   * - 标题：`title` 只控制首页大标题；站内「日记」类内容的称呼见 `labels.diary`。
   * - `showTitles: false` 只关闭首页日记条目的标题；详情/归档/RSS 的回退标题见 `dailyTitleFallback`。
   */
  //   home: {
  //     title: '日记',
  //     subtitle: '一篇一篇，日子就有了形状。',
  //     showTitles: true,
  //   },

  // 站内内容称呼 `labels.diary` 省略时按 `lang` 使用内置值（当前 `zh_CN` 为「日记」）。
  //   labels: {
  //     diary: '日记',
  //   },

  /**
   * 顶部导航（可选）。
   *
   * - 可选值：`NavItem[]`；一级链接 `{ title, link }`，二级分组 `{ title, items }`（只能一层，`items` 至少一项）。
   * - 默认：按 `lang` 使用内置导航（`zh_CN` 为日记 / 文章分组 / 友链 / 关于）。
   * - 注意：内部链接必须以 `/` 开头；外链必须 `http(s)://`，且不能带 query/hash。
   * - 复用：移动端底部导航会按 `href` 取这里的标题；命中分组子项时显示分组名。
   *   `bottomNav.items[].title` 显式配置时优先于这里的推导。
   */
  //   nav: [
  //     { title: '日记', link: '/' },
  //     {
  //       title: '文章',
  //       items: [
  //         { title: '全部文章', link: '/posts' },
  //         { title: '分类', link: '/categories' },
  //         { title: '标签', link: '/tags' },
  //         { title: '归档', link: '/archives' },
  //       ],
  //     },
  //     { title: '友链', link: '/friends' },
  //     { title: '关于', link: '/about' },
  //   ],

  /**
   * 页脚导航（可选）。
   *
   * - 可选值：`{ title, link }[]`，只支持一级链接，规则与 `nav` 相同。
   * - 默认：按 `lang` 使用内置「归档 / 友链 / RSS」三项；显式配置后不会被翻译。
   * - 注意：显式配置 `footerNav` 后不会自动追加 RSS；需要时手动加入 `{ title: 'RSS', link: '/feed.xml' }`。
   */
  //   footerNav: [
  //     { title: '归档', link: '/archives' },
  //     { title: '友链', link: '/friends' },
  //   ],

  /**
   * 移动端底部导航（可选）。
   *
   * - `enabled`：是否显示，默认 `true`；关闭后移动端不再渲染底栏，也不预留底部空白。
   * - `items`：入口列表，至少一项；省略时使用内置四项（首页 / 文章 / 友链 / 关于）。
   * - 每项字段：`link` 必填；`title` 可选，省略时按 `nav` 配置或内置文案推导；
   *   `icon` 可选，取 `src/assets/sprite.html` 中的 id（如 `i-book`），省略时按链接推导。
   * - 显式配置 `items` 会整体替换默认四项，而不是追加。
   * - 注意：内部链接规则与 `nav` 相同；外链会新窗口打开。
   */
  // bottomNav: {
  //   enabled: true,
  //   items: [
  //     { link: '/', title: '日记', icon: 'i-book' },
  //     { link: '/posts', title: '文章', icon: 'i-file' },
  //     { link: '/friends', title: '友链', icon: 'i-link' },
  //     { link: '/about', title: '关于', icon: 'i-user' },
  //   ],
  // },

  /**
   * 分页数量（可选）。
   *
   * - 字段：
   *   - `daily`：首页日记流每页条数，默认 `20`。
   *   - `post`：文章列表每页条数，默认 `20`。
   * - 可选值：正整数。
   * - 注意：第一页是 `/` 或 `/posts`，不是 `/page/1`；越界分页返回 404。
   */
  pagination: { daily: 8, post: 8 },

  /**
   * 归档页默认展示类型（可选）。
   *
   * - `defaultType`：`'articles'` 或 `'diary'`，默认 `'articles'`。
   * - 设为 `'diary'` 时，归档页默认选中日记，且日记按钮排在文章按钮之前。
   * - 只影响归档页的类型切换，不改变条目内部的日期排序。
   */
  // archive: {
  //   defaultType: 'diary',
  // },

  /**
   * 无标题日记的回退标题（可选）。
   *
   * - `detail`：详情页标题（隐藏 H1 的文本、浏览器标题、面包屑、结构化数据与 Pagefind），默认 `'date'`。
   * - `archive`：归档列表标题，默认 `'slug'`。
   * - `feed`：RSS 条目标题，默认 `'date'`。
   * - 每项可为 `'date'`、`'slug'`、`'untitled'`（当前语言的内置「未命名」文案），
   *   或 `{ template: '...' }`；可用占位符为 `{date}`、`{slug}`、`{diary}`、`{untitled}`。
   * - 只影响没有 `title` 的日记；文章标题仍必填。无标题日记的详情页 H1 保持视觉隐藏。
   */
  // dailyTitleFallback: {
  //   detail: 'date',
  //   archive: 'slug',
  //   feed: 'date',
  // },

  /**
   * RSS 配置（可选）。
   *
   * - `enabled`：总开关，默认 `true`；关闭后不生成任何 feed。
   * - `default`：默认 feed（`/feed.xml`）的开关与范围；`scope` 可选 `'all' | 'diary' | 'post'`，默认 `'all'`。
   * - `diary` / `posts`：日记 feed（`/feed-diary.xml`）与文章 feed（`/feed-posts.xml`）的子开关，默认开启。
   * - `fullText`：`false`（默认）输出摘要，`true` 输出渲染后的正文 HTML。
   * - `limit`：单份 feed 的最大条目数，默认 `20`，必须为正整数且 ≤ 200。
   * - 注意：草稿与 `hideFrom: [rss]` 的内容始终排除；密码内容只输出标题与 `description`。
   */
  rss: {
    enabled: true,
    default: { enabled: true, scope: 'all' },
    diary: { enabled: true },
    posts: { enabled: true },
    fullText: false,
    limit: 20,
  },

  /**
   * 评论配置（可选）。
   *
   * - `enabled`：评论总开关，默认 `true`；单篇内容仍可用 frontmatter `comments: false` 关闭。
   * - `provider`：评论系统名称，默认 `'twikoo'`；必须命中 `SUPPORTED_COMMENT_PROVIDERS`
   *   （`twikoo` / `waline` / `artalk`），不支持时只输出 `console.warn` 并隐藏评论区，不阻断构建。
   * - `twikoo.envId`：Twikoo 环境 ID 或部署地址，默认 `''`。
   * - `twikoo.region`：Twikoo 云开发地域，默认 `''`（留空用默认值）。
   * - `twikoo.lang`：Twikoo 界面语言，缺省时由站点 `lang` 推导。
   * - `waline.serverURL`：Waline 服务端地址；留空时客户端静默失败。
   * - `waline.login`：Waline 登录策略，默认 `'enable'`（允许匿名与登录）。
   * - `waline.pageSize`：Waline 每页评论数，默认 `10`。
   * - `artalk.server`：Artalk 服务端地址；留空时客户端静默失败。
   * - `artalk.site`：Artalk 站点名，需与服务端 `site_name` 一致；省略时回退站点标题。
   * - `artalk.pageSize`：Artalk 每页评论数，默认 `20`。
   * - 注意：各后端地址为空时评论区仍会照常初始化，组件不拦截空值，配置提示交给评论系统自己。
   * - 本地测试 Artalk demo 时，`https://artalk.qwqaq.com` 未返回 CORS 头，
   *   需先起一个本地反向代理转发该地址，再把 `artalk.server` 临时改为 `http://127.0.0.1:8080`。
   */
  comments: {
    enabled: false,
    provider: 'twikoo',
    twikoo: { envId: '', region: '' },
    waline: { serverURL: '' },
    artalk: { server: '', site: '' },
  },

  /**
   * MDX 增强配置（可选）。
   *
   * - `mdx.meting.api`：Meting-API 基础地址；默认 `'https://163.hyc.moe/'`，推荐自部署。
   * - `mdx.meting.timeout`：单次请求超时时间（毫秒）；默认 `5000`。
   * - `mdx.meting.cache`：服务端请求缓存；默认开启。
   *   - `ttl.playlist` / `ttl.search`：短缓存，默认 1 天。
   *   - `ttl.default`：其它类型的长缓存，默认 30 天。
   * - 用途：MDX 里通过 `import { meting } from '@mdx'` 调用 `meting.fetchMusic()` 或
   *   `meting.player({ client: false })` 时，构建期请求使用的地址、超时与缓存。
   * - 注意：`meting.player()` 默认在浏览器端取数（`client` 默认 `true`），不读这个缓存，浏览器会直接请求 API。
   */
  mdx: {
    meting: {
      api: 'https://163.hyc.moe/',
      timeout: 5000,
      cache: {
        enabled: true,
        ttl: {
          playlist: 1 * 24 * 60 * 60 * 1000,
          search: 1 * 24 * 60 * 60 * 1000,
          default: 30 * 24 * 60 * 60 * 1000,
        },
      },
    },
  },

  /**
   * 全站自定义 HTML 注入（可选）。
   *
   * - `headEnd`：输出到每个页面 `</head>` 之前；`bodyEnd`：输出到 `</body>` 之前。
   * - 可选值：任意 HTML 字符串；默认均为 `''`（不注入）。
   * - 用途：站点验证 `<meta>`、统计脚本、自定义 `<script>` / `<style>` 等。
   * - 注意：内容按原样输出，不做转义或清洗，只放自己写的可信 HTML；
   *   站内跳转（View Transitions）不会重新执行注入的 `<script>`，
   *   需要每次导航都运行请监听 `astro:page-load`。
   */
  //   inject: {
  //     headEnd: '<meta name="example-verify" content="..." />',
  //     bodyEnd: '<script src="/custom.js" defer></script>',
  //   },

  /**
   * SEO / Open Graph 配置（可选）。
   *
   * - `ogImage`：默认 OG 图，默认 `'/og-default.png'`；必须是 `/` 开头的 public 路径或 http(s) URL。
   * - `twitterCard`：Twitter Card 类型，默认 `'summary_large_image'`。
   * - `locale`：OG `og:locale`，缺省时由站点 `lang` 推导。
   */
  seo: {
    ogImage: '/og-default.png',
    twitterCard: 'summary_large_image',
  },

  /**
   * sitemap 配置（可选）。
   *
   * - `enabled`：是否生成 `sitemap.xml`，默认 `true`。
   * - `includeProtected`：是否把密码保护页面纳入 sitemap，默认 `false`（密码页仍会输出 `noindex`）。
   */
  sitemap: { enabled: true, includeProtected: false },

  /**
   * robots.txt 配置（可选）。
   *
   * - `enabled`：是否生成 `robots.txt`，默认 `true`。
   * - `disallow`：额外禁止抓取的路径数组，默认 `[]`；每项必须以 `/` 开头。
   * - 注意：密码页 URL 会自动追加到 `Disallow`，`Allow: /` 始终输出。
   */
  robots: { enabled: true, disallow: [] },

  /**
   * 页脚版权配置（可选）。
   *
   * - `enabled`：是否显示版权信息，默认 `true`。
   * - `yearFrom`：版权起始年份，默认取 `since`。
   * - `author`：版权署名，默认取站点 `author`。
   */
  copyright: { enabled: true, yearFrom: 2026 },

  /**
   * 备案信息（可选）。
   *
   * - 可选值：`{ text, link? }[]`，默认 `[]`；可配置多条。
   * - `link` 可省略；出现时必须是 http(s) 外链或以 `/` 开头的内部链接。
   */
  //   icp: [{ text: '示例备案号 00000000', link: 'https://beian.miit.gov.cn/' }],
});
