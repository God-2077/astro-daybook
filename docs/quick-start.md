# 快速开始

这页带你把 Daybook 在本地跑起来：安装依赖、启动开发服务器、改成自己的站点、写下第一篇日记，最后构建出可以上传到静态托管的 `dist/`。照着做大约需要 10 分钟；开始前你需要一台能运行 Node.js 与终端命令的电脑，版本要求见下一节。

## 做出什么

完成后你会得到：

- 一个本地开发服务器，地址是 `http://localhost:4321`，首页显示仓库自带的示例日记。
- 改好的 `src/config/site.ts`：站点标题、域名与作者都是你自己的。
- 一篇自己的日记，首页和详情页都能打开。
- 一个 `dist/` 目录，里面是完整的静态站点与搜索索引，可以上传到任意静态托管。

## 前置条件

| 需要 | 要求 | 检查命令 |
| --- | --- | --- |
| Node.js | `>=22.23.4`（以 `package.json` 的 `engines` 为准） | `node --version` |
| pnpm | `>=7.1.0`；仓库只使用 pnpm | `pnpm --version` |
| Git | 用于克隆仓库 | `git --version` |
| 终端与文本编辑器 | 能执行命令、编辑 Markdown 与 TS 文件 | — |
| 网络 | `pnpm install` 需要访问 npm registry | — |

版本低于要求时先升级 Node.js。没有 pnpm 时按 <https://pnpm.io/installation> 安装；不要用 npm 或 yarn 代替 pnpm。

## 1 获取代码并安装

在终端依次执行：

```bash
git clone https://github.com/God-2077/astro-daybook.git
cd astro-daybook
pnpm install
```

你应该看到：克隆完成后出现 `astro-daybook/` 目录；`pnpm install` 结束没有报错，并生成 `node_modules/`。本文之后的所有命令都在 `astro-daybook/` 目录下执行。

## 2 启动开发服务器

```bash
pnpm dev
```

你应该看到：终端输出本地访问地址（默认 `http://localhost:4321`）。在浏览器打开它，会看到示例日记的首页。

- 修改 `src/content/` 下的内容后，页面会自动刷新。
- 停止服务器：在终端按 `Ctrl+C`。
- `url`、`lang` 等启动时读取的配置，改完要重启 `pnpm dev` 才生效。

## 3 改成自己的站点

打开 `src/config/site.ts`，把下面四个字段的值改成你自己的（只改值，不要删掉文件里现有的其他字段）：

```ts
export const siteConfig = defineSiteConfig({
  title: '你的站点名',
  url: 'https://example.com',
  author: '你的名字',
  timezone: 'Asia/Shanghai',
});
```

文件里其余字段与注释保持原样即可。四个字段的作用：

- `title`：浏览器标签、导航品牌名、RSS 标题与页脚品牌名。
- `url`：站点公开地址，必须是完整的 `http://` 或 `https://` 地址，不能带查询参数或 `#`；末尾的 `/` 会被自动去掉。部署前必须改成真实域名。
- `author`：作者名，用于页脚版权、页面 `<meta name="author">` 与关于页。
- `timezone`：IANA 时区，日期展示、RSS 时间与 sitemap 时间都按它计算，默认 `Asia/Shanghai`。

你应该看到：保存并刷新后，浏览器标签页与页脚版权署名变成你自己的。界面语言由 `lang` 决定，可选 `en`、`ja`、`zh_CN`、`zh_TW`，一次构建只输出一种；完整字段写在[配置说明](./configuration.md)里。

## 4 写第一篇日记

在 `src/content/daily/` 新建 `2026-11-14-first-diary.md`，写入：

```md
---
title: 十一月的第一杯茶
date: 2026-11-14 21:30:00
---

今天把 Daybook 跑起来了。接下来想每天写一点。
```

- 文件名可以自己取，`date` 写这篇日记的日期；只有 `date` 是必填字段。
- `date` 不带时区时按 `siteConfig.timezone` 解释；只写 `2026-11-14` 表示当天 00:00。
- 日记地址由文件路径生成：这篇的地址是 `http://localhost:4321/daily/2026-11-14-first-diary`。

你应该看到：保存后首页出现这篇日记；点标题或「查看原文」进入详情页。没出现时，确认文件在 `src/content/daily/`、扩展名是 `.md` 或 `.mdx`，并且 frontmatter 里有 `date`。

## 5 构建与预览

先构建静态站点：

```bash
pnpm build
```

你应该看到：构建结束没有报错，生成 `dist/`；其中 `dist/index.html` 与 `dist/pagefind/` 都存在。`postbuild` 会用 Pagefind 为 `dist/` 生成搜索索引。

再预览构建结果：

```bash
pnpm preview
```

打开终端输出的地址（默认 `http://localhost:4321`），站点内容与 `pnpm dev` 一致，站内搜索可以搜到刚写的日记。

- 构建要用 `pnpm build`：它会自动运行 `postbuild`（`pagefind --site dist`），这依赖仓库 `.npmrc` 里的 `enable-pre-post-scripts=true`。
- `pnpm dev`、`pnpm build`、`pnpm preview` 都通过 `scripts/astro.mjs` 包装器执行，会处理内容模式与内容缓存；请始终用这些 `pnpm` 脚本，不要直接运行 `astro` 命令。
- 直接运行 `astro build` 不会生成 `dist/pagefind/`，站内搜索会失效。
- 部署时把整个 `dist/` 上传到静态托管，步骤写在[部署指南](./deployment.md)里。

## 完成检查

- [ ] `pnpm dev` 打开 `http://localhost:4321`，首页显示示例日记。
- [ ] `src/config/site.ts` 的 `title`、`url`、`author` 已改成你自己的。
- [ ] `src/content/daily/` 里有你新建的日记，首页和详情页都能打开。
- [ ] `pnpm build` 成功结束，`dist/index.html` 与 `dist/pagefind/` 都存在。
- [ ] `pnpm preview` 下站内搜索能搜到刚写的日记。
- [ ] 你知道后续配置都在 `src/config/site.ts`，完整字段写在[配置说明](./configuration.md)里。

## 下一步

| 我想… | 看 |
| --- | --- |
| 写日记、文章、独立页面，写对 frontmatter | [写作指引](./writing.md) |
| 改导航、语言、评论、SEO、分页 | [配置说明](./configuration.md) |
| 把站点部署到静态托管 | [部署指南](./deployment.md) |
| 把内容放进独立仓库 | [双仓库：主题与内容分离](./dual-repo.md) |
| 浏览全部文档 | [文档索引](./README.md) |

## 卡住了

| 现象 | 先做什么 |
| --- | --- |
| 提示 `pnpm: command not found` | 按「前置条件」安装 pnpm，不要用 npm 代替。 |
| Node.js 版本过低 | 用 `node --version` 确认已升级到 `22.23.4` 或更高。 |
| `pnpm install` 失败 | 确认终端在仓库根目录、网络能访问 npm registry，然后再执行一次 `pnpm install`。 |
| 打不开 `http://localhost:4321` | 看 `pnpm dev` 的终端输出，打开它打印的地址。 |
| 构建报 `[daybook:config]` | 配置字段写错，见[配置校验失败](./configuration.md#校验失败)。 |
| 构建报 `[daybook:content]` | 内容文件有问题，先对照[写作指引](./writing.md)的 frontmatter 参考与「写完检查」。 |
| 首页看不到刚写的日记 | 确认文件在 `src/content/daily/`、有 `date`，并且没有写 `draft: true`。 |
| 搜索没有结果 | 确认用 `pnpm build` 生成过 `dist/pagefind/`；仍没有结果见[排错](./troubleshooting.md)。 |
