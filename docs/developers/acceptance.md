# 开发期验收清单

> 本文件与 `tests/` 只用于开发阶段，交付后可整体删除，不参与构建。

改完主题后按下面的分组逐项核对。涉及内容写法与配置的含义，分别看[写作指引](../writing.md)、[配置说明](../configuration.md)；部署前的环境检查看[部署指南](../deployment.md)。适用于仓库 `main` 分支当前代码（`package.json` 1.2.1）。

## 构建

- [ ] `pnpm check` 0 errors。
- [ ] `pnpm build` 成功，`postbuild` 生成 `dist/pagefind/`。
- [ ] `pnpm lint` 通过。
- [ ] `pnpm test` 通过（单元断言 + 构建产物断言）。
- [ ] `pnpm test:build` 最后一行是 `build assertions passed: N indexed pages, M default RSS items`，且 `N` 与 `tests/build/assert-dist.ts` 的断言一致（当前断言 31 个 `data-pagefind-body` 页面，内容变动时同步改断言）。

## 日期

- [ ] 无时区 `2026-10-20 21:30:00` 按 `Asia/Shanghai` 显示。
- [ ] 带 `+08:00` 的 ISO 按绝对时刻显示。
- [ ] 仅日期 `2026-10-12` 在配置时区仍是 10-12。
- [ ] RSS `pubDate`、sitemap `lastmod`、详情页日期一致。
- [ ] 把系统时区改为 UTC 后构建，页面日期不变。

## 可见性矩阵

| 场景 | 生产详情 | dev 详情 | 首页/列表 | 归档 | RSS | Pagefind | 标签/分类 | sitemap | 直接 URL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 公开 | 200 | 显示 | 显示 | 显示 | 有 | 索引 | 显示 | 有 | 200 |
| `draft` | 无 | 显示+草稿 | dev 显示 | dev 显示 | 无 | 无 | dev 显示 | 无 | 404 |
| `password` | 200 | 显示 | 标题+描述 | 显示 | 标题+描述+固定正文 | 标题+描述 | 显示 | 默认无 | 200 |
| `hideFrom: home` | 200 | 显示 | 隐藏 | 显示 | 有 | 索引 | 显示 | 有 | 200 |
| `hideFrom: rss` | 200 | 显示 | 显示 | 显示 | 无 | 索引 | 显示 | 有 | 200 |
| `hideFrom: archive` | 200 | 显示 | 显示 | 隐藏 | 有 | 索引 | 显示 | 有 | 200 |
| `hideFrom: search` | 200 | 显示 | 显示 | 显示 | 有 | 无 body | 显示 | 有 | 200 |
| `hideFrom: tag/category` | 200 | 显示 | 显示 | 显示 | 有 | 索引 | 隐藏 | 有 | 200 |
| `hideFrom: sitemap` | 200 | 显示 | 显示 | 显示 | 有 | 索引 | 显示 | 无 | 200 |

- [ ] 逐行核对 `dist/` 与开发服务器。
- [ ] `post/locked-letter`（密码 `paper2026`）与 `daily/2026-09-28-locked`（密码 `paper2024`）：初始 HTML 不含明文；错误密码提示「密码错误，请再试一次」；正确密码能解锁。
- [ ] 解锁后布局/字号/行距/日期栏/TOC/endmark/评论区与普通详情一致，只多「已解锁 · …」提示。
- [ ] 分类/标签明细的锁图标正常显示。
- [ ] 密码页 `noindex`，默认不在 sitemap，Pagefind 只索引标题+描述。

## MDX

- [ ] `.mdx` 文章（`/post/mdx-syntax`）正常渲染表达式、单图与 h2 ✦。
- [ ] `.mdx` 日记（`/daily/2026-10-20-redesign`）详情与首页流正常渲染。
- [ ] `src/content/pages/` 的独立页（`/music`）由 `src/pages/[...page].astro` 套 `PageLayout`，日期与标题正常，h2 带 ✦。
- [ ] 页面 HTML 不含泄漏的 `import` / `export` 语句。
- [ ] 给 `.mdx` 加 `password` 时构建报错，错误信息说明 MDX 暂不支持密码。
- [ ] `rss.fullText: true` 时 MDX 回退摘要并输出一次警告；恢复默认后无警告。
- [ ] `::::timeline` 的日期、标题、正文在浅/深色与 375/768/1024/1440 宽度下正常；≤767 日期栏收窄。
- [ ] Pagefind 索引为 31 页（与 `tests/build/assert-dist.ts` 的 `data-pagefind-body` 页面断言一致）。

## 路由与分页

- [ ] `/page/1`、`/posts/page/1` 404。
- [ ] `/page/<越界>`、`/posts/page/<越界>` 404。
- [ ] 空分类/空标签/无搜索结果有空状态。
- [ ] 详情页上下都没有「返回文章/返回文章索引」。
- [ ] meta 中「日记/文章」是指向 `/` 或 `/posts` 的链接。
- [ ] 分类/标签 URL 对中文正确编码。

## 导航与交互

- [ ] 手机端打开抽屉，当前页显示 `✦`（首页/文章/友链/关于，以及文章子项）。
- [ ] 二级菜单可点击/键盘打开，Esc 关闭。
- [ ] 点击搜索隐藏正文，关闭恢复；搜索 tabs 全部/日记/文章/页面可用。
- [ ] View Transitions 后主题、搜索、TOC、抽屉仍正常。
- [ ] 深色模式持久化；`prefers-reduced-motion` 下无描边动画。
- [ ] 375/390 宽底部导航默认四项；`bottomNav.enabled: false` 时不渲染且页面没有底部预留空白。
- [ ] 自定义 `bottomNav.items` 后顺序、标题、图标生效；外链新窗口打开；无效内链构建报错。
- [ ] `archive.defaultType: 'diary'` 时归档默认日记、按钮日记在前；切回文章后统计、热力图、锚点正常。

## 首页配置

- [ ] 修改 `src/config/site.ts` 的 `home.title` 为「碎碎念」，首页 H1 改变。
- [ ] 修改 `home.subtitle`，`.a-feedhead-sub` 改变；清空时依次回退到 `siteConfig.subtitle`、`siteConfig.description`。
- [ ] 给某篇日记加 `hideHomeTitle: true`，首页该条目无标题但正文正常；详情页/归档/RSS 标题不受影响。

## RSS / SEO

- [ ] 三个 feed 的开关、范围、全文/摘要、limit 生效。
- [ ] feed 链接与正文链接为绝对 URL；时间使用配置时区。
- [ ] canonical、OG、Twitter Card、JSON-LD 正确。
- [ ] 分页 canonical 指向自身，rel prev/next 正确。
- [ ] robots.txt 输出 `Allow: /`，排除密码页与配置的 disallow。
- [ ] sitemap 排除草稿/隐藏/密码页，包含独立页面。

## 构建时 i18n

把 `src/config/site.ts` 的 `lang` 依次改为 `en`、`ja`、`zh_CN`、`zh_TW`，每次重新构建并检查：

- [ ] `<html lang>` 分别为 `en`、`ja`、`zh-CN`、`zh-TW`；没有 `/[lang]` 路由或语言切换器。
- [ ] `og:locale` 分别为 `en_US`、`ja_JP`、`zh_CN`、`zh_TW`。
- [ ] feed `<language>` 分别为 `en`、`ja`、`zh-CN`、`zh-TW`。
- [ ] 导航、分页、搜索面板、密码页、404、归档统计使用当前语言；英文单复数正确。
- [ ] 日期显示分别为 `Oct 20, 2026`、`2026/10/20`、`2026-10-20`；`<time datetime>` 始终是 ISO `YYYY-MM-DD`。
- [ ] 显式配置的 `seo.locale` / `comments.twikoo.lang` 能覆盖由 `lang` 推导的值。
- [ ] 正文、站点标题/描述、关于页、友链与分类/标签名称不随 `lang` 改变。
- [ ] 改回 `zh_CN` 后 `pnpm test` 仍通过（现有中文构建断言）。

## 与原型对照

使用 `playwright_mcp_isolated_config_1`：

- [ ] 1440 宽：首页、文章列表、详情、加密页、分类/标签、归档、关于、友链、404。
- [ ] 390 宽：首页、详情、抽屉、底部导航。
- [ ] 浅色/深色。
- [ ] 以用户要求优先：去掉详情返回链接、meta 类型链接、搜索隐藏正文、解锁后同版式、首页标题配置、移动端 `✦`。

相关文档：[写作指引](../writing.md)、[配置说明](../configuration.md)、[部署指南](../deployment.md)、[双仓库](../dual-repo.md)、[实现取舍](./reference.md)、[文档索引](../README.md)。
