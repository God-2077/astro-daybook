# Daybook 文档

Daybook 是一个以日记为主的静态博客主题：用 Markdown 写内容，构建成纯静态站点，不需要数据库或服务端进程。

文档对应仓库 `main` 分支的当前代码（`package.json` 版本 1.2.1），全部使用简体中文。根目录 README 另有 [English](../README.en.md)、[日本語](../README.ja.md)、[繁體中文](../README.zh-TW.md) 版本。

## 从哪读起

| 你的情况 | 建议顺序 |
| --- | --- |
| 第一次接触 Daybook | [快速开始](./quick-start.md) → [配置说明](./configuration.md) → [写作指引](./writing.md) |
| 已经在写内容 | [写作指引](./writing.md) → [Markdown 增强](./markdown.md) → [配置说明](./configuration.md) |
| 准备上线 | [部署指南](./deployment.md) → [部署到 Vercel](./deployment-vercel.md) → [双仓库](./dual-repo.md) |
| 构建失败、效果不对 | [排错](./troubleshooting.md) |
| 维护主题本身 | [实现取舍](./developers/reference.md) → [Termux 构建](./developers/termux.md) → [验收清单](./developers/acceptance.md) |

## 文档总览

| 页面 | 解决什么 | 形态 |
| --- | --- | --- |
| [快速开始](./quick-start.md) | 从零跑起站点，写下第一篇日记并构建 | 教程 |
| [配置说明](./configuration.md) | 查每个站点配置字段、默认值与校验失败的处理 | 参考 |
| [写作指引](./writing.md) | 写日记、文章、独立页面；frontmatter、URL、可见性与密码 | 操作指南 |
| [Markdown 增强](./markdown.md) | 查脚注、公式、Mermaid、指令、Alert、折叠块等写法 | 参考 |
| [音乐播放器](./music-player.md) | 在任意页面放一组可播放歌单 | 操作指南 |
| [部署指南](./deployment.md) | 把 `dist/` 部署到任意静态托管 | 操作指南 |
| [部署到 Vercel](./deployment-vercel.md) | 主题仓库 + 内容仓库的自动发布链路 | 教程 |
| [双仓库](./dual-repo.md) | 主题与内容分仓：什么时候用、怎么 clone/pull、怎么构建 | 解释 + 操作指南 |
| [排错](./troubleshooting.md) | 按报错或现象定位配置、构建、搜索、评论、时区等问题 | 排错 |
| [Meting API](./developers/meting-api.md) | 在 MDX 里取音乐信息、渲染播放器、缓存与参数 | 参考 |
| [Termux 构建](./developers/termux.md) | 在 Termux / Android 上修复 Sätteri、Pagefind、sharp 的构建问题 | 操作指南 |
| [实现取舍](./developers/reference.md) | 维护者视角：参考项目、关键取舍与内容模式实现 | 解释 |
| [验收清单](./developers/acceptance.md) | 发版前逐项核对构建、可见性、路由与 i18n | 检查清单 |
| [PR-Agent](./developers/pr-agent.md) | 用 GitHub Actions 接入 DeepSeek 代码审查、描述与问答 | 操作指南 |

## 术语

| 术语 | 含义 |
| --- | --- |
| 主题模式 | 默认模式：内容读 `src/content/`，静态资源读 `public/`，站点配置读 `src/config/`；用 `pnpm dev` / `pnpm build` |
| 内容模式 | 内容与站点配置来自独立内容仓库（`CONTENT_REPO`）；用 `pnpm dev:content` / `pnpm build:content` |
| 内容根 | 当前模式下的内容目录：主题模式是 `src/content/`，内容模式是内容仓库根目录 |
| 主题仓库 | 本仓库，包含代码、页面、样式与文档 |
| 内容仓库 | 单独存放日记、文章、独立页面、静态资源与站点配置的 Git 仓库 |
| 独立页面 | `pages/` 集合下的页面（例如 `/music`），不进入首页、归档与 RSS |
| 可见性 | `frontmatter` 中的 `draft`、`hideFrom`、`password` 等字段，决定内容出现在哪些位置 |
| 日记 / 文章 | 日记在 `daily/`，文章在 `post/`；两者的 frontmatter schema 不同 |

## 版本与范围

- 文档描述的是 `main` 分支当前代码，不保证适用于旧版本；升级后请以仓库内的 README 与文档为准。
- 文档不覆盖 Astro 本身：路由、组件语法与部署平台的界面，请看各自的官方文档。
- 内容仓库示例：<https://github.com/God-2077/astro-daybook-content/>
- 在线预览：<https://daybook.demo.ksable.top/>

## 维护约定

改配置字段、路由或内容 schema 时，同步更新对应页面与 [AGENTS.md](../AGENTS.md)；页面之间的锚点改动要同时改引用。
