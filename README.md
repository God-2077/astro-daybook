# Daybook

一页可以慢慢读的日记站——一个基于 Astro 的静态博客主题，用 Markdown 写下每天，构建成安静、素净、能搜索的个人博客。

**在线预览**：<https://daybook.demo.ksable.top/>

简体中文 · [English](./README.en.md) · [日本語](./README.ja.md) · [繁體中文](./README.zh-TW.md)

---

<table width="100%" align="center">
  <tr>
    <td colspan="3" align="center">
      <img src="./docs/images/preview-desktop-light.png" alt="桌面端 · 浅色">
      <br>桌面端 · 浅色
    </td>
  </tr>
  <tr>
    <td align="center"><img src="./docs/images/preview-desktop-dark.png" alt="桌面端 · 深色"><br>桌面端 · 深色</td>
    <td align="center"><img src="./docs/images/preview-mobile-light.png" alt="移动端 · 浅色"><br>移动端 · 浅色</td>
    <td align="center"><img src="./docs/images/preview-mobile-dark.png" alt="移动端 · 深色"><br>移动端 · 深色</td>
  </tr>
  <tr>
    <td colspan="3" align="center">
      <img src="./docs/images/lighthouse.png" alt="Lighthouse 性能报告">
      <br>Lighthouse
    </td>
  </tr>
</table>

---

## 功能特性

- **以日记为主**：一天一篇，自动按月分组，左侧日期栏让时间线一目了然
- **文章另存**：需要写长文时放文章目录，自带分类、标签与关键词
- **安静的设计**：纸白底色、细线分隔、淡粉点缀，没有卡片、描边和阴影
- **深色模式**：跟随系统，也可以手动切换，切换不闪白
- **全文搜索**：构建时生成索引，输入即搜，可按日记、文章、页面筛选
- **置顶与草稿**：置顶日记单独成组；草稿只在本地开发时出现
- **长文自动折叠**：首页只露开头，想读完再点「展开全文」
- **正文增强**：侧边目录、代码高亮、数学公式、图片点开放大、脚注
- **密码保护**：某一篇只想自己看，加一个密码即可
- **评论**：随时接入 Twikoo、Waline 或 Artalk
- **归档与热力图**：按年月回顾全部内容，写作热力图显示哪几天留下了字
- **订阅与分享**：三路 RSS、sitemap、robots，以及链接卡片预览图
- **音乐页**：把喜欢的歌单放进站内播放
- **多语言**：一次构建输出简体中文、繁體中文、English、日本語中的一种界面
- **手机友好**：小屏自动收起导航，底部导航随手切换，可配置或关闭
- **主题与内容分仓（可选）**：内容仓库独立 clone/pull，写作提交不必混进主题历史

## 快速开始

需要 Node.js **22.23.4** 以上与 [pnpm](https://pnpm.io/)。

```bash
git clone https://github.com/God-2077/astro-daybook.git
cd astro-daybook
pnpm install
pnpm dev        # 打开 http://localhost:4321
```

跑起来之后：

1. 打开 `src/config/site.ts`，把标题、副标题、作者和 `url`（真实域名）改成自己的。
2. 在 `src/content/daily/` 里新建一个 `.md` 文件，写下第一篇日记。
3. `pnpm build` 生成 `dist/`，把整个目录上传到任意静态托管即可。

托管平台（Vercel、Cloudflare Pages、Netlify 等）可以直接导入仓库：构建命令填 `pnpm build`，输出目录填 `dist`。详细步骤见[部署说明](./docs/configuration.md#部署)；用内容仓库 + Vercel 自动发布时，见 [Vercel 自动化部署](./docs/deployment-vercel.md)。

## 主题仓库与内容仓库（可选）

默认的 `pnpm dev` / `pnpm build` 使用主题自带的 `src/content/`。如果想让写作内容独立成 Git 仓库：

1. 准备 `content/`（结构：`post/`、`daily/`、`pages/`、`spec/`、`public/`、`config/`），或在远端建好后在 `.env` 填写 `CONTENT_REPO_URL`；
2. 运行 `pnpm content:clone` 拉取内容仓库（已有示例骨架时先参考文档处理）；
3. 用 `pnpm dev:content` / `pnpm build:content` 使用内容仓库，`pnpm content:pull` 更新；静态资源放在 `content/public/`，`pnpm og:content` 会生成内容仓库自己的 OG 图。

根目录的 `content/` 已被主题的 `.gitignore` 忽略，它只是示例骨架；正式内容应放在独立的内容仓库里。

内容仓库的 `config/site.ts` 与 `links.ts` 通过 `import type` 复用主题的 `SiteConfigInput` / `LinksConfigInput` 类型，并默认导出普通对象；主题会用与 `src/config/` 相同的 schema 校验。完整说明见 [`docs/dual-repo.md`](./docs/dual-repo.md)。

## 更快捷地写日记（可选）

嫌开 IDE 写日记太麻烦？还要手动建文件、敲 git 命令一步步提交？
试试 [Astro Blog Studio](https://github.com/God-2077/astro-blog-studio)，在浏览器里直接关联你的仓库，同目录下写日记，实时预览效果，一键提交推送。

它不会改动你的仓库结构和构建配置，只是把新建、编辑、提交这几步全搬到浏览器里完成，每天随手写几笔特别方便。

## Frontmatter 示例

日记放在 `src/content/daily/`，只有 `date` 必填：

```yaml
---
title: 十一月的第一杯茶
date: 2026-11-01 21:30:00
category: 日常 # 首页/详情/归档里的展示标签
# updated: 2026-11-02 09:00:00
# description: 手写一段摘要，用于 RSS、搜索与分享卡片
# slug:                          # 默认由文件路径生成
# permalink: notes/first-tea     # 覆盖完整 URL
# draft: true                    # 草稿：只在开发时可见
# pin: true                      # 置顶
# password: paper2024            # 加密：输入密码才能读正文
# hideFrom: [home, rss, archive, search, tag, category, sitemap]
# comments: false
---
```

文章放在 `src/content/post/`，`title` 与 `date` 必填，另外支持分类与标签：

```yaml
---
title: 用 Astro 搭一个日记站
date: 2026-10-20 10:00:00
categories: [文章]
tags: [Astro, 前端]
keywords: [静态博客]
---
```

字段全集、可见性矩阵与 URL 规则见 [`docs/content.md`](./docs/content.md)。

## 配置说明

配置都是 TypeScript 文件，改完刷新开发服务器即可生效；字段写错会在构建时直接报错并指出位置。

| 想改什么 | 去哪里 |
| --- | --- |
| 标题、副标题、作者、域名、语言、导航、分页、评论、SEO | `src/config/site.ts` |
| 友链分组 | `src/config/links.ts` |
| 关于页正文 | `src/content/spec/about.mdx` |
| 音乐页歌单 | `src/content/pages/music.mdx` |
| 内容仓库地址、目录、分支、SSH 私钥 | `.env` 的 `CONTENT_REPO_*` |
| 内容模式下的站点配置、友链 | `content/config/site.ts`、`content/config/links.ts` |

- 全部配置字段、评论接入、部署与安全边界：[`docs/configuration.md`](./docs/configuration.md)
- 内容目录、frontmatter 与可见性：[`docs/content.md`](./docs/content.md)
- 主题与内容分仓、clone/pull：[`docs/dual-repo.md`](./docs/dual-repo.md)
- 用 Vercel 自动部署（Deploy Hook + 内容仓库 GitHub Action）：[`docs/deployment-vercel.md`](./docs/deployment-vercel.md)
- 歌单与播放器：[`docs/music-player.md`](./docs/music-player.md)
- Meting 音乐客户端（MDX）：[`docs/meting.md`](./docs/meting.md)

## 鸣谢

本站正文使用字体 [寒蝉全圆体](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular)。

感谢以下项目对 astro-daybook 的开发提供的灵感及参考：

- [astro-koharu](https://github.com/cosZone/astro-koharu)
- [Firefly](https://github.com/CuteLeaf/Firefly)
- [Mizuki](https://github.com/LyraVoid/Mizuki)
- [fuwari](https://github.com/saicaca/fuwari)

## License

[GNU Affero General Public License version 3 (AGPL-3.0)](./LICENSE)

第三方资源：正文图片放大使用 [lightGallery](https://www.lightgalleryjs.com/)（GPLv3 / 商业双许可，授权说明见[文档](./docs/configuration.md#图片放大)），字体为寒蝉全圆体子集（OFL-1.1）。
