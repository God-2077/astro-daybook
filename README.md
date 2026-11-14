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

- **以日记为主，文章另存**：一天一篇，自动按年月分组；长文放文章目录，自带分类、标签与关键词。
- **安静纸页与深色模式**：纸白底色、1px 细线、淡粉点缀，没有卡片与阴影；深色模式跟随系统，也可以手动切换。
- **搜索、归档与热力图**：构建时生成搜索索引，输入即搜；归档按年月回顾，热力图显示哪几天留下了字。
- **写作增强**：脚注、数学公式、Mermaid、GitHub Alert、折叠块、时间线、视频与仓库嵌入；代码可复制、图片点开放大、正文带侧边目录。
- **可见性控制**：置顶、草稿、密码保护，以及按位置隐藏（首页、RSS、归档、搜索、标签、分类、sitemap）。
- **评论与订阅**：随时接入 Twikoo、Waline 或 Artalk；三路 RSS、sitemap、robots 与分享卡片。
- **多语言与手机友好**：一次构建输出简体中文、繁體中文、English、日本語中的一种界面；小屏收起导航，底部导航可配置或关闭。
- **主题与内容分仓（可选）**：内容仓库独立 clone / pull，写作提交不混进主题历史。

## 快速开始

需要 Node.js **22.23.4** 以上与 [pnpm](https://pnpm.io/)（见 `package.json` 的 `engines`）。

```bash
git clone https://github.com/God-2077/astro-daybook.git
cd astro-daybook
pnpm install
pnpm dev        # 打开 http://localhost:4321
```

跑起来之后：

1. 打开 `src/config/site.ts`，把 `title`、`url`（真实域名）和 `author` 改成自己的。
2. 在 `src/content/daily/` 新建一个 `.md` 文件，写下第一篇日记——只有 `date` 必填。
3. 运行 `pnpm build` 生成 `dist/`，把整个目录上传到任意静态托管。

最小的一篇日记：

```yaml
---
title: 十一月的第一杯茶
date: 2026-11-14 21:30:00
---
```

完整的安装、写作与构建步骤见[快速开始](./docs/quick-start.md)。

## 内容仓库（可选）

默认的 `pnpm dev` 与 `pnpm build` 使用主题自带的 `src/content/`。如果想让写作内容独立成 Git 仓库：把内容放进独立仓库，在 `.env` 用 `CONTENT_REPO_URL` 指向它，再用 `pnpm content:clone` 拉取、用 `pnpm dev:content` / `pnpm build:content` 构建。官方内容仓库示例：<https://github.com/God-2077/astro-daybook-content/>。

完整步骤与限制见[双仓库：主题与内容分离](./docs/dual-repo.md)。

## 配置

| 想改什么 | 去哪里 |
| --- | --- |
| 标题、副标题、作者、域名、语言、导航、分页、评论、SEO | `src/config/site.ts` |
| 友链分组 | `src/config/links.ts` |
| 关于页正文 | `src/content/spec/about.mdx` |
| 音乐页歌单 | `src/content/pages/music.mdx` |
| 内容仓库地址、目录、分支、SSH 私钥 | `.env` 的 `CONTENT_REPO_*` |
| 内容模式下的站点配置与友链 | `<内容根>/config/site.ts`、`<内容根>/config/links.ts` |

全部字段、默认值与校验失败的处理见[配置说明](./docs/configuration.md)。

## 文档

| 我想… | 看 |
| --- | --- |
| 第一次装起来跑通 | [快速开始](./docs/quick-start.md) |
| 改配置、导航、评论、SEO | [配置说明](./docs/configuration.md) |
| 写日记与文章、frontmatter、密码保护 | [写作指引](./docs/writing.md) |
| 用脚注、公式、Mermaid、折叠块 | [Markdown 增强](./docs/markdown.md) |
| 在页面里放歌单 | [音乐播放器](./docs/music-player.md) |
| 部署到静态托管 | [部署指南](./docs/deployment.md) |
| 用 Vercel + 内容仓库自动发布 | [部署到 Vercel](./docs/deployment-vercel.md) |
| 主题与内容分仓 | [双仓库](./docs/dual-repo.md) |
| 构建失败、搜索没结果 | [排错](./docs/troubleshooting.md) |
| 接入 PR-Agent 代码审查 | [PR-Agent](./docs/developers/pr-agent.md) |
| 全部文档与维护者文档 | [文档索引](./docs/README.md) |

## 写日记更省事（可选）

嫌开 IDE、手动建文件、敲 git 命令太麻烦，可以试试 [Astro Blog Studio](https://github.com/God-2077/astro-blog-studio)：在浏览器里关联仓库，同目录写日记、实时预览、一键提交推送。它不改变仓库结构与构建配置。

## 鸣谢

本站正文使用字体 [寒蝉全圆体](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular)。

感谢以下项目对 astro-daybook 的开发提供的灵感及参考：

- [astro-koharu](https://github.com/cosZone/astro-koharu)
- [Firefly](https://github.com/CuteLeaf/Firefly)
- [Mizuki](https://github.com/LyraVoid/Mizuki)
- [fuwari](https://github.com/saicaca/fuwari)

## License

[GNU Affero General Public License version 3 (AGPL-3.0)](./LICENSE)

第三方资源：正文图片放大使用 [lightGallery](https://www.lightgalleryjs.com/)（GPLv3 / 商业双许可，授权说明见[配置说明的「图片放大」](./docs/configuration.md#图片放大)），字体为寒蝉全圆体子集（OFL-1.1）。
