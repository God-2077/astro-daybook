# 部署到静态托管

## 适用场景与前置

Daybook 的构建结果是纯静态文件：没有 Node 服务端，没有数据库，搜索索引也是构建期生成的静态文件。这页带你在本地构建、预览，再把 `dist/` 放到任意静态托管上，并确认上线结果。适合第一次把站点上线，也适合换托管平台时对照检查。

你需要先有：

- 已按[快速开始](./quick-start.md)在本地跑通 `pnpm dev`，依赖已安装。
- Node.js 满足 `package.json` 的 `engines`（`>=22.23.4`），包管理器使用 pnpm（`>=7.1.0`）。
- 一个静态托管账号，或一台能往托管上传文件的机器。
- 一个根路径的站点地址，例如 `https://example.com`；原因见[放在子路径](#放在子路径)。

## 构建前要改的三件事

| 改什么 | 在哪里改 | 不改会怎样 |
| --- | --- | --- |
| `url` | 主题模式：`src/config/site.ts`；内容模式：`<内容根>/config/site.ts` | canonical、OG、RSS、sitemap、`robots.txt` 里的绝对地址都会是占位域名 |
| 站点信息 | 同上：`title`、`subtitle`、`author`、`avatar`、`lang` | 标签页、页头、页脚与 `<head>` 里仍是示例文案；`lang` 是构建时选项，一次构建只输出一种语言 |
| 内容 | 主题模式：`src/content/{daily,post,pages,spec}`；内容模式：内容仓库的对应目录 | 仓库自带的示例日记与示例文章会一起上线 |

配置在构建期读取，改完要重新构建才生效。字段含义与默认值见[配置说明](./configuration.md)；内容目录与 frontmatter 见[写作指引](./writing.md)。

可选：把 lightGallery 的正式授权 key 写进仓库根目录的 `.env`：

```dotenv
# .env
PUBLIC_LIGHTGALLERY_LICENSE_KEY=LIG-xxxx
```

不设置时构建使用评估 key，浏览器控制台会有一条 not-for-production 警告。说明见[配置说明的「图片放大」](./configuration.md#图片放大)。`.env` 已被 `.gitignore` 忽略，不要提交。

## 构建与本地预览

1. 在仓库根目录运行 `pnpm build`。

   预期：终端以构建成功信息结束，仓库根目录出现 `dist/`。构建结束后会自动执行 `postbuild`（`pagefind --site dist`，依赖 `.npmrc` 里的 `enable-pre-post-scripts=true`），生成 `dist/pagefind/` 搜索索引。

2. 运行 `pnpm preview`。

   预期：终端打印本地预览地址，打开后与开发服务器看到的站点一致。`preview` 只是在本地静态服务 `dist/`，不会改动产物。

3. 核对产物。`dist/` 根目录下应有：

   - `index.html`、`_astro/`、`pagefind/`、`404.html`
   - 默认配置下还有 `feed.xml`、`feed-diary.xml`、`feed-posts.xml`、`sitemap.xml`、`robots.txt`（由构建期静态端点生成）

不要用 `astro build` 代替 `pnpm build`：它不会触发 `postbuild`，产物里没有搜索索引。`dist/` 已被 `.gitignore` 忽略，不要提交进仓库。

## 上传到静态托管

有两种方式，按托管平台支持的情况选：

1. **托管平台连接 Git 仓库构建**：选择仓库，构建命令填 `pnpm build`，输出目录填 `dist`，包管理器保持 pnpm（仓库带 `pnpm-lock.yaml`）。平台在 Node.js 环境里安装依赖并执行构建。
2. **本机构建后上传**：先运行 `pnpm build`，再把 `dist/` 整个目录作为站点根上传（FTP、SFTP、rsync、对象存储工具都可以）。必须连同 `_astro/`、`pagefind/` 等子目录一起上传；只传 `index.html` 会丢样式、字体与搜索。

托管侧需要满足这几点：

- 把无扩展名的地址映射到目录里的 `index.html`：`/posts` 对应 `posts/index.html`。产物由 `astro.config.ts` 的 `build.format: 'directory'` 与 `trailingSlash: 'never'` 决定。
- 能把 `dist/404.html` 作为未命中页返回。
- 站点部署在域名根路径，不带子路径（见[放在子路径](#放在子路径)）。
- 平台构建用的 Node.js 版本满足 `package.json` 的 `engines.node`（`>=22.23.4`）。

平台的功能入口与套餐限额以官方文档为准：[Cloudflare Pages](https://developers.cloudflare.com/pages/)、[Netlify](https://docs.netlify.com/)、[GitHub Pages](https://docs.github.com/en/pages)。Vercel 的完整自动发布链路见[部署到 Vercel](./deployment-vercel.md)。

## 内容仓库模式怎么部署

内容模式只是把内容根与站点配置换成内容仓库，产物同样是 `dist/`。构建机需要先拿到内容仓库。

- **构建环境能 clone 内容仓库**：在环境变量里提供 `CONTENT_REPO_URL`（私有仓库用带 token 的 HTTPS 地址，或 SSH 地址加 `CONTENT_REPO_SSH_KEY`），可选 `CONTENT_REPO_BRANCH`、`CONTENT_REPO_DIR`；构建命令用 `pnpm content:clone && pnpm build:content`。
- **构建机上已有内容目录**：设置 `CONTENT_REPO_DIR`（默认 `content`）后运行 `pnpm build:content`。`build:content` 末尾自带 `pagefind --site dist`，不需要再加 `postbuild`。
- `pnpm content:clone` 遇到已存在的 Git 仓库会打印「内容仓库已存在：content，跳过克隆。」并直接跳过，不校验远端、不拉取更新。构建目录里残留旧 `content/` 时内容不会更新；需要重置时，把构建命令改成 `rm -rf content && pnpm content:clone && pnpm build:content`，或换一个 `CONTENT_REPO_DIR`。
- 内容仓库的 `config/site.ts` 里的 `url` 同样要改成真实域名；内容模式的静态资源来自 `<内容根>/public/`，主题 `public/` 不会复制进 `dist/`。

变量含义、内容仓库结构与本地 clone 步骤见[双仓库](./dual-repo.md)；Vercel 上的自动重建流程见[部署到 Vercel](./deployment-vercel.md)；凭据边界见[配置说明的「安全边界」](./configuration.md#安全边界)。

## 部署后检查清单

- [ ] `https://<你的域名>/` 返回 200，样式、字体、图片正常。
- [ ] 打开一篇日记和一篇站内文章详情，地址没有尾斜杠。
- [ ] 打开搜索面板，输入关键词能看到结果（说明 `dist/pagefind/` 已部署）。
- [ ] `https://<你的域名>/feed.xml`、`/feed-diary.xml`、`/feed-posts.xml` 能打开，条目链接以真实域名开头。
- [ ] `https://<你的域名>/sitemap.xml` 能打开，`<loc>` 是真实域名。
- [ ] `https://<你的域名>/robots.txt` 的 `Sitemap:` 行是真实域名；如果有密码页，它们的地址出现在 `Disallow:` 行。
- [ ] 打开一个不存在的地址，看到的是 `dist/404.html`，不是托管平台的默认页。
- [ ] 内容模式：页面渲染的是内容仓库里的内容，不是主题仓库自带的示例。

## 放在子路径

Daybook 按根路径部署设计，不能直接放在子路径：

- `astro.config.ts` 没有设置 Astro 的 `base`。
- 站内链接与资源路径都以 `/` 开头：导航项在配置校验时要求内部链接以 `/` 开头（`src/config/define.ts` 的 `validateNavLink`），正文图片按 `/images/...` 引用（示例见 `src/content/post/markdown-syntax.md`）。
- `siteConfig.url` 只作为站点根地址参与绝对地址拼接。把它写成带路径的地址（例如 `https://example.com/blog`）不会让站内链接带上 `/blog`，canonical、RSS 与 sitemap 会指向错误地址。

如果你只能放在子路径（例如 GitHub Pages 的项目站点是 `https://<用户名>.github.io/<仓库名>/`），需要给 Astro 配置 `base`，并同步调整所有根路径链接与绝对地址的生成逻辑；仓库没有提供这套配置。优先改用独立域名或子域。

## 常见失败

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 站内搜索没有结果 | 构建时用了 `astro build`，或上传时漏了 `dist/pagefind/` | 用 `pnpm build` 重新构建，把整个 `dist/` 上传 |
| 打开 `/posts` 或文章地址返回 404 | 托管没有把 `/posts` 映射到 `posts/index.html` | 开启静态网站托管与目录索引，或按平台文档配置无扩展名路径 |
| 页面能打开，但没有样式、字体或图片 | 只上传了 HTML，漏了 `_astro/` 与 `dist/` 根下的静态资源 | 把 `dist/` 整体重新上传 |
| 页面链接、canonical、RSS 里都是 `https://example.com` | `siteConfig.url` 仍是占位域名 | 改成真实域名后重新构建 |
| 内容模式构建时报缺少内容仓库配置 | 构建环境没有内容仓库，或 `CONTENT_REPO_DIR` 指错 | 先 `pnpm content:clone`，或用 `CONTENT_REPO_DIR` 指向已有的内容目录 |
| 内容模式构建成功，站点仍是示例内容 | 构建命令没有进入内容模式（仍是 `pnpm build`） | 改用 `pnpm content:clone && pnpm build:content` |
| 子路径下样式与链接错乱 | 站点被部署到 `https://example.com/blog/` | 改回根路径部署，见[放在子路径](#放在子路径) |
| 访问不存在的地址看到平台默认页 | 托管没有配置自定义 404 页面 | 把 `dist/404.html` 设为自定义 404 |

以上没有命中时，按报错关键字在[排错](./troubleshooting.md)里查，或看[配置说明的「校验失败」](./configuration.md#校验失败)。

相关页面：[快速开始](./quick-start.md)、[写作指引](./writing.md)、[配置说明](./configuration.md)、[双仓库](./dual-repo.md)、[部署到 Vercel](./deployment-vercel.md)、[排错](./troubleshooting.md)、[文档索引](./README.md)。
