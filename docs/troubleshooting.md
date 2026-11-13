# 排错

这页按「现象 → 原因 → 解决 → 验证」处理 Daybook 的常见故障：配置校验、内容没生成、搜索为空、日期偏移、评论不显示、内容模式、Markdown 指令、Termux、Meting 与图片放大授权。前置：能按[快速开始](./quick-start.md)在仓库根目录运行命令，并知道自己当前是主题模式还是内容模式。

## 怎么用这页

先看终端或浏览器控制台里的报错前缀，再到对应小节处理。每节末尾的「验证」用来确认已经修好。

| 前缀 | 来源 | 常见于 |
| --- | --- | --- |
| `[daybook:config]` | 配置解析与语义校验（`src/config/define.ts`） | `pnpm dev` / `pnpm build` 启动时 |
| `[daybook:content]` | 内容 frontmatter、URL 与分类/标签校验；`content:clone` / `content:pull` 脚本 | 构建期、克隆或拉取内容仓库时 |
| `[daybook:project]` | 导航链接与路由校验 | 构建期 |
| `[daybook:markdown]` | Markdown 指令 | 构建期渲染正文时 |
| `[daybook:meting]` | Meting 请求、缓存与浏览器播放器 | 构建期与浏览器控制台 |
| `[daybook:feed]` | RSS 构建警告 | 构建期 |
| `[daybook:termux]` | Termux 修复脚本 | `pnpm fix:termux` |
| `[daybook]` | 包装器脚本（`scripts/astro.mjs` 等） | 启动、切换内容来源、读取 `.env` 时 |

排查顺序：

1. 复制完整报错，至少包含第一行（前缀、文件、字段路径或行号）。
2. 按前缀进对应小节；没有命中时再按报错原文搜索本页。
3. 只改一处，按该节的「验证」确认后再继续。
4. 修改配置、`.env` 或依赖后重启 `pnpm dev`；构建失败则重跑 `pnpm build`。

## 配置校验失败

**现象**

```text
[daybook:config] src/config/site.ts > nav[1].link
  nope 不是合法内部链接（必须以 / 开头）
```

也可能只有一行 `Unrecognized key: "xxx"`，或 `since 必须在 … 之间`、`非法 IANA 时区：…` 这类取值错误。

**原因**

- `src/config/site.ts` 与 `links.ts` 在模块加载时依次做 Zod 结构校验与语义校验，任何一步失败都会终止启动。
- 结构校验只报第一个 Zod issue（未知字段、类型不对）；字段类型合法但取值不合法（时区、URL、导航链接、年份、分页、slug）在语义校验阶段报错。
- 内容模式下配置来自 `<内容根>/config/`，文件路径会显示为 `content/config/site.ts` 这类相对路径。

**解决**

1. 读第一行「文件 > 字段路径」：`nav[1].link` 指 `nav` 数组第 2 项的 `link`，`(root)` 指整个对象。
2. 对照[配置说明的「校验失败」](./configuration.md#校验失败)与字段表改值；内容模式按 `CONTENT_REPO` 找到实际文件。
3. 保存后重试。主题模式下改 `url` / `lang` 需要重启 `pnpm dev`（它们在启动时被 `astro.config.ts` 读取）；内容模式下配置文件变化会自动重启 dev server。
4. 如果报错前缀是 `[daybook:project]` 且提示「导航链接 … 没有对应路由」，那属于构建期路由检查：按报错里的路径改链接或先创建页面，独立页面不能放进导航。

**验证**

- 重新运行 `pnpm dev` 或 `pnpm build`，不再出现 `[daybook:config]`。
- 打开页面确认标题、URL 与导航入口已按新配置生效。
- 如果只是不受支持的评论 `provider`，终端只有一条 `[daybook:config]` 警告，构建继续、评论区隐藏；那不是校验失败。

## 构建成功但内容不对

构建退出码为 0，但页面缺失、顺序或标题与预期不同。先确认实际读取的是哪个内容根，再按下面的症状排查。

### 页面没有生成

**现象**：本地能看到的日记或文章，`pnpm build` 后 `dist/` 里没有对应目录；或 `pnpm preview` 打开是 404。

**原因**

- `draft: true`：生产构建不生成详情页，也不会进 RSS、搜索与 sitemap；`pnpm dev` 仍会显示并带草稿标记。
- 内容不在当前内容根：主题模式读 `src/content/`，内容模式读 `CONTENT_REPO` 指向的目录。
- URL 不是预期的 `/{集合}/{文件相对路径}`：可能被 `permalink` 或 `slug` 改写。

**解决**

- 发布前去掉 `draft: true`；草稿与可见性的完整规则见[写作](./writing.md)。
- 确认运行模式：终端出现 `[daybook] 内容仓库模式：content` 时读内容仓库，否则读主题的 `src/content/`。
- 按 URL 规则在 `dist/` 里找文件，或打开页面查看 canonical 确认实际 URL。

**验证**：`pnpm build` 后能在 `dist/` 找到对应 HTML，`pnpm preview` 能打开；草稿页在该构建里不存在。

### 列表顺序或标题不对

**现象**：首页或归档顺序与预期不同；无标题日记显示日期或 slug；首页不显示日记标题。

**原因**

- 排序是 `pin` 降序 → `date` 降序 → `slug` 升序，`updated` 不参与排序。
- 无标题日记按 `dailyTitleFallback` 取回退标题：详情与 RSS 默认用日期，归档默认用 slug。
- 首页是否显示标题由 `home.showTitles` 与单篇 frontmatter `hideHomeTitle` 控制，不影响详情页与归档。
- `hideFrom` 只影响聚合页与索引（`home`、`rss`、`archive`、`search`、`tag`、`category`、`sitemap`），不会删除详情页。

**解决**

- 调整 frontmatter 的 `pin`、`date`、`slug`；`updated` 只影响详情页的「更新于」显示。
- 需要换回退方式时改 `dailyTitleFallback.detail` / `archive` / `feed`，默认值见[配置说明的无标题日记回退](./configuration.md#无标题日记的标题回退-dailytitlefallback)。
- 首页标题用 `home.showTitles` 全局控制，或用 `hideHomeTitle` 单篇控制。

**验证**：重新构建后看首页第一条与归档标题；三份 feed 的标题与日期符合预期。

### URL 或订阅链接不对

**现象**：详情页 URL 与预期不同；canonical、RSS、sitemap 里出现错误域名；feed 条目数少于预期。

**原因**

- 详情页 URL 默认由文件相对集合根的路径生成（保留目录、去掉扩展名）。显式 `slug` 覆盖集合之后的部分，`permalink` 覆盖整个 URL。
- 绝对链接都来自 `siteConfig.url`，改域名后必须重新构建。
- 每份 feed 默认最多 20 条（`rss.limit`），并排除草稿与 `hideFrom: [rss]` 的内容；`pin` 不影响 feed 顺序。

**解决**

- 需要固定 URL 时在 frontmatter 写 `permalink`（不能为空，不能含 `?`、`#`、反斜杠）。
- 把 `siteConfig.url` 改成本站真实域名后重新构建。
- 调整 `rss.limit`，或检查内容的 `draft` / `hideFrom`。

**验证**：打开详情页看 `<link rel="canonical">`；检查 `dist/sitemap.xml` 的 `<loc>` 与 `dist/feed.xml` 的条目数、域名。

### 语言改了但正文没变

**现象**：改 `lang` 后导航、按钮、日期格式变了，正文与标题仍是原语言。

**原因**：`lang` 只切换主题 UI、日期格式与页面元信息，不会翻译内容。

**解决**：正文、站点标题与描述、关于页正文、友链、分类与标签名称都需要自己准备对应语言的版本。一次构建只输出一种语言，没有站内切换或 `/[lang]` 路由。

**验证**：`<html lang>` 与导航文案已变化；正文按原文输出属于正常行为。

## 搜索没有结果

**现象**：搜索面板显示「索引未就绪」与「搜索索引尚未生成。运行 pnpm build 后，Pagefind 会在 dist 中建立索引。」；或构建成功但搜不到某些内容。

**原因**

- 在 `pnpm dev` 里搜索：开发服务器不生成 Pagefind 索引。
- 构建方式不对：直接 `astro build` 不会生成索引；`pnpm build` 依赖 `.npmrc` 里的 `enable-pre-post-scripts=true` 触发 `postbuild`（`pagefind --site dist`）。内容模式要用 `pnpm build:content`，它会在构建后显式调用 pagefind。
- 内容被排除：`draft: true` 与 `hideFrom: [search]` 不进索引；密码内容只索引标题与 `description`。

**解决**

1. 用 `pnpm build`（主题模式）或 `pnpm build:content`（内容模式）重新构建，并确认 `.npmrc` 没有被删改。
2. 确认 `dist/pagefind/pagefind.js` 存在。
3. 运行 `pnpm preview` 后在浏览器里搜索，不要用 `pnpm dev` 验证搜索。
4. 检查内容是否 `draft: true` 或 `hideFrom` 含 `search`。

**验证**：`pnpm preview` 打开搜索，输入页面标题里的词能返回结果，面板不再显示「索引未就绪」。索引范围见[配置说明的「搜索索引」](./configuration.md#搜索索引)，构建与托管见[部署](./deployment.md)。

## 日期或时区不对

### 日期差一天或时间偏移

**现象**：页面、RSS 或 sitemap 里的日期比 frontmatter 写的早或晚一天。

**原因**

- 不带时区的日期按 `siteConfig.timezone` 解释（`YYYY-MM-DD` 视为该时区当天 0 点），与构建机器的本地时区无关。
- 带 `Z` 或 `±HH:mm` 的 ISO 8601 保留其绝对时刻，展示时换算到站点时区。
- `timezone` 同时决定 RSS 时间、sitemap `lastmod`、页脚年份与 `since` 默认年份。

**解决**：把 `siteConfig.timezone` 设为站点实际使用的 IANA 时区；只写日期时用 `YYYY-MM-DD`，需要精确时刻时写带偏移量的 ISO 8601。

**验证**：详情页日期、`dist/feed.xml` 的 `pubDate`、`dist/sitemap.xml` 的 `lastmod` 与预期一致。

### 日期格式报错

**现象**

```text
[daybook:content] src/content/daily/2026-13-01.md
  2026-13-01.md:date 的值 "2026-13-01" 不是有效日期
```

**原因**：日期不是合法日历日，或格式不在支持范围内。日期只接受 `YYYY-MM-DD`、`YYYY-MM-DD HH:mm:ss`，以及带 `Z` 或 `±HH:mm` 的 ISO 8601。

**解决**：修正不存在的日期，或把日期改成支持的格式。

**验证**：重新构建通过，详情页与 feed 显示正确日期。

### 时区配置报错

**现象**

```text
[daybook:config] src/config/site.ts > timezone
  非法 IANA 时区：Asia/Chongqing
```

**原因**：`timezone` 不是合法的 IANA 时区名。

**解决**：改成 `Asia/Shanghai`、`Asia/Tokyo`、`UTC` 这类 IANA 名称；不要写 `UTC+8` 或带空格的城市别名。

**验证**：构建通过，日期与页脚年份按新时区显示。

## 评论不显示

**现象**：详情页底部没有评论区；或有评论区但一直加载、初始化失败。

**原因**

- 仓库示例 `src/config/site.ts` 里 `comments.enabled: false`，默认不显示评论。
- `comments.provider` 不受支持：终端只有一条 `[daybook:config]` 警告，页面隐藏评论区。
- 单篇内容的 frontmatter 写了 `comments: false`。
- 密码内容：解锁前不加载评论，解锁后才出现。
- 后端没配置好：服务端地址或环境 ID 为空、填错；组件不拦截空值，失败提示由评论系统自己给出。
- Waline 的 `serverURL` 带了末尾斜杠，或 Artalk 的 `site` 与服务端 `site_name` 不一致。

**解决**

1. 把 `comments.enabled` 改为 `true`，`comments.provider` 设为 `twikoo`、`waline`、`artalk` 之一。
2. 按后端填配置：Twikoo 填 `envId`；Waline 填 `serverURL`（不带末尾斜杠）；Artalk 填 `server` 与和服务端一致的 `site`。
3. 确认该篇内容没有 `comments: false`；密码内容先解锁。
4. 打开浏览器控制台与网络面板，确认对应评论系统的请求是否失败；后端域名、跨域与初始化参数以对应评论系统的文档为准。

**验证**：页面出现评论区域，网络面板里对应请求成功，能提交并看到一条测试评论。字段表见[配置说明的「评论」](./configuration.md#评论)。

## 内容模式问题

**现象**

内容模式启动或构建失败，终端出现以下一类报错；或命令成功但读到的内容不对。

```text
内容仓库缺少 config/site.ts：C:\...\content\config\site.ts
读取内容仓库配置失败：…
内容仓库必须与主题仓库在同一盘符：D:\...
内容仓库不能是主题仓库根目录；请把 CONTENT_REPO 指向一个子目录或独立的内容目录。
[daybook:content] 缺少 CONTENT_REPO_URL；请在 .env 中填写 http(s) 或 ssh 克隆地址（见 docs/dual-repo.md）。
```

**原因**

- 内容模式要求内容根下有 `config/site.ts` 与 `config/links.ts`，并且必须与主题仓库同盘符、不能等于主题根。
- 目录优先级是 `--content-repo` > `CONTENT_REPO_DIR` > `content`；`CONTENT_REPO` 为空或 `0` / `false` / `off` / `no` 时回到主题模式。
- `content:clone` 需要 `.env` 里的 `CONTENT_REPO_URL`；SSH 地址还需要 `CONTENT_REPO_SSH_KEY`（私钥路径）。已存在的 Git 仓库会被跳过，不会自动拉取。
- 直接设置 shell 变量 `CONTENT_REPO=...` 也会生效，即使命令没有带 `--content`。

**解决**

1. 用 `pnpm dev:content` / `pnpm build:content`，或给包装器加 `--content`、`--content-repo=<目录>`；看终端开头的 `[daybook] 内容仓库模式：...` 确认模式与目录。
2. 按[双仓库的「内容仓库配置」](./dual-repo.md#内容仓库配置)在内容根创建 `config/site.ts` 与 `config/links.ts`。
3. 克隆或更新：在 `.env` 填 `CONTENT_REPO_URL`（HTTP(S) 可内联 token，SSH 必须给私钥路径）后运行 `pnpm content:clone` / `pnpm content:pull`；pull 只做 `--ff-only`。
4. 切换内容来源后仍看到旧页面：包装器会清理 Astro 内容缓存并输出 `[daybook] 内容来源已切换，已清理 Astro 内容缓存`；如果仍异常，删除 `.astro/` 与 `node_modules/.astro-content/` 后重启。内容文件修改由内容层热更新，内容仓库的 `config/*.ts` 修改会自动重启 dev server。

**验证**：终端显示内容仓库模式与目录；修改内容仓库里的内容后刷新页面能看到变化；`pnpm build:content` 产出的页面来自内容仓库。更多结构说明见[双仓库](./dual-repo.md)。

### 线上内容没有更新

**现象**：把新内容 push 到内容仓库后重新部署，线上仍是旧内容。

**原因**：`content:clone` 对已存在的 Git 仓库直接跳过、不执行 pull。部署平台的构建缓存里如果保留了上一次的 `content/`，构建仍会使用旧内容。

**解决**：在托管平台触发一次干净重建或 Deploy Hook（Vercel 的完整流程见[部署到 Vercel](./deployment-vercel.md)）；本地则运行 `pnpm content:pull` 后再构建。

**验证**：重新部署后线上页面出现新内容；构建日志里能看到重新克隆或拉取内容仓库。

## Markdown 指令报错

**现象**：构建失败并出现 `[daybook:markdown]` 前缀的报错；或终端只有警告、页面里指令被当成普通文字。

**原因**：指令的冒号数量、属性或内容结构不符合要求。已知指令形态错误会中断构建；未知指令只输出警告并降级为普通内容。

常见报错：

| 报错片段 | 原因 | 解决 |
| --- | --- | --- |
| `github 是 叶子（::name）指令，请调整冒号数量。` | 用 `:::` 写叶子指令 | 改成 `::github` |
| `note 是 容器（:::name ... :::）指令，请调整冒号数量。` | 用 `::` 写容器指令 | 改成 `:::note` 开头、`:::` 结尾 |
| `kbd 是 文本（:name）指令，请调整冒号数量。` | 冒号数量写错 | 改成 `:kbd` |
| `::github 需要 repo="owner/repo"。` / `::github 的 repo 必须是 owner/repo。` | 缺少 `repo` 或格式不对 | 补上 `owner/repo` |
| `::youtube 需要 id。` / `::youtube 的 id 不合法。` / `::bilibili 的 id 必须是 BV 号。` | 缺少或写错视频 ID | 补上正确的视频 ID 或 BV 号 |
| `::meting 需要 id。` / `::meting 的 type 只能是 song、playlist 或 albumlist。` | 缺少 `id` 或 `type` 不在允许范围 | 补 `id`；`type` 改成这三个之一 |
| `:::music 的 YAML 解析失败：…` / `:::music 必须包含 YAML 列表。` / `:::music playlist[0].url is required` | 内容不是 YAML 列表或曲目缺少必填字段 | 按 YAML 列表书写，每条补 `name` 与 `url` |
| `::::timeline 的外层需要使用 4 个冒号，内层 :::event 使用 3 个。` / `::::timeline 里只能放 :::event。` / `:::event 缺少 date 属性。` / `:::event 的 date 必须写成 YYYY-MM-DD。` | 时间线结构或日期格式不对 | 外层 4 个冒号、内层 3 个冒号；每个 `:::event` 写 `date` |
| `:underline 的 type 只能是 line、wavy、dot、dashed 或 double。` / `:hidden 的 type 只能是 blur 或 background。` | 不支持的 `type` | 改成允许值 |
| `未知容器指令 :::foo，已按普通内容输出。` / `未知叶子指令 ::foo，已忽略。` / `未知文本指令 :foo，已按普通内容输出。` | 指令名拼错或冒号数量不对；未知指令只警告 | 对照 [Markdown 的指令清单](./markdown.md)修正 |

**解决**

1. 在报错里找到文件名与行号，按表格改冒号数量、必填属性或 YAML 结构。
2. 已知指令的完整写法见 [Markdown](./markdown.md)；降级警告不会中断构建，但也应改掉拼写。

**验证**：重新构建，终端不再出现对应的 `[daybook:markdown]` 报错；页面中对应区块按预期渲染（时间线、折叠、音乐播放器等）。

## Termux 构建失败

**现象**

```text
Cannot find module '@bruits/satteri-android-arm64'
```

```text
Error: UVWASI_EACCES, uvwasi_init
```

```text
Failed to install either of [pagefind_extended, pagefind].
Most likely the platform android-arm64 is not yet a supported architecture.
```

**原因**：Astro 7 的配置 schema 会加载 Sätteri，而 Sätteri 没有 Android 原生绑定，WASI 回退又把根目录作为 preopen，被 Android 拒绝；Pagefind 没有 `android-arm64` 包；`sharp` 在 Android 上需要 wasm 回退。

**解决**

1. 在仓库根目录运行一键修复：`pnpm fix:termux`。脚本幂等，会写入 `pnpm-workspace.yaml`、生成 `patches/`、补装 wasm 回退并验证。
2. 先看改动加 `-- --dry-run`：`pnpm fix:termux -- --dry-run`；补丁没有生效时用 `pnpm fix:termux -- --reinstall`；修复后直接构建加 `-- --build`。
3. 不要使用 `pnpm install --force`：它会安装所有平台的可选依赖，可能写满磁盘。
4. 脚本默认只在 Android 上运行，其它平台需要加 `--force`；手动步骤与补丁内容见 [Termux](./developers/termux.md)。

**验证**：脚本结束时输出 `Sätteri（WASI 回退）、Pagefind 与 sharp（wasm 回退）均可用。` 与 `修复完成。`；随后 `pnpm build` 成功并生成 `dist/pagefind/`。

## Meting 加载失败

### 构建期请求失败

**现象**

```text
[daybook:meting] 请求超时（5000ms）：https://163.hyc.moe/?...
```

```text
[daybook:meting] 触发 Meting-API 限流（HTTP 429）：...
```

**原因**

- `fetchMusic()` 与 `meting.player({ client: false })` 在构建期请求；API 不可达、超时（`mdx.meting.timeout`，默认 5000ms）、返回非 JSON 或非曲目数组都会让构建失败。
- 公共 API 有 30 秒限流窗口，大量请求会命中 HTTP 429。
- 构建期缓存未命中时才会真实请求；重复构建同一查询通常直接命中缓存。

**解决**

- 把 `mdx.meting.api` 改成可用地址；请求量大或需要稳定时自部署 Meting-API。
- 适当增大 `mdx.meting.timeout`；不要在 MDX 里循环调用 API。
- 保留服务端缓存（`mdx.meting.cache.enabled` 默认开启）；需要强制刷新时在查询里加 `refresh: true`。

**验证**：`pnpm build` 通过，页面曲目正常渲染。接口与缓存细节见 [Meting API](./developers/meting-api.md)。

### 浏览器播放器加载失败

**现象**：播放器标题变成「音乐加载失败」，浏览器控制台出现 `[daybook:meting] 客户端加载失败：…`。

**原因**

- 浏览器端播放器直连 Meting-API，不经过服务端缓存，也没有本地代理。
- API 不可达、跨域不通过、HTTPS 页面请求 HTTP API（混合内容）、查询参数不完整（如缺 `id`、`search` 缺 `keyword`）都会失败。
- 曲目没有可播放地址（版权或平台限制）时也会报错。

**解决**：确认 `mdx.meting.api` 可访问且允许跨域；HTTPS 站点不要配置 HTTP API；检查查询参数；在浏览器网络面板里看失败请求。对稳定性要求高的页面改成构建期模式（`client: false`）。

**验证**：播放器出现曲目列表并可播放；控制台不再出现 `[daybook:meting] 客户端加载失败`。

### 缓存导致内容过时

**现象**：更新歌单、封面或音频地址后重新构建，页面仍是旧数据；终端出现 `[daybook:meting] 缓存文件格式不可识别，将重新生成：…` 或写入失败警告。

**原因**：服务端缓存按完整请求 URL 保存，`playlist` / `search` 默认缓存 1 天，其它类型默认 30 天；`refresh` 参数不参与缓存键。缓存文件损坏或不可写只警告，不阻断构建。

**解决**：单次查询加 `refresh: true`；或删除缓存文件（主题模式 `.cache/meting-api-data.json`，内容模式 `<内容根>/cache/meting-api-data.json`）；也可以临时关闭 `mdx.meting.cache.enabled`。

**验证**：重新构建后数据更新；缓存警告消失或只剩写入失败的提示。缓存机制见 [Meting API 的「服务端缓存」](./developers/meting-api.md#服务端缓存)。

## 图片放大控制台警告

**现象**：打开有正文图片的页面并点开图片放大层时，浏览器控制台输出：

```text
lightGallery: 0000-0000-000-0000 license key is not valid for production use. See https://www.lightgalleryjs.com/docs/license/
```

**原因**：没有设置 `PUBLIC_LIGHTGALLERY_LICENSE_KEY`，`astro.config.ts` 的 `env.schema` 回落到 lightGallery 的临时评估 key。功能不受影响，只是提醒不能用于生产。

**解决**

1. 把 `.env.example` 复制为 `.env`，设置 `PUBLIC_LIGHTGALLERY_LICENSE_KEY=<正式 v3 key>`；正式 key 以 `LIG` 开头。
2. 重启 `pnpm dev` 或重新 `pnpm build`：`astro:env/client` 的值在构建时内联，热更新不会替换它。
3. 如果警告变成 `this license key is for v1 or v2...`，说明填的是旧版 key，需要 v3 key。

**验证**：重新构建后打开图片放大层，控制台不再出现 lightGallery 授权警告；缩放、缩略图、全屏可用。

如果点图片没有反应，确认它是正文 Markdown 图片（`img.a-img`，且没有被链接包裹）；自定义 HTML 里的图片不会进入放大层。授权说明见[配置说明的「图片放大」](./configuration.md#图片放大)。

## 怎么确认修好了

按改动类型选验证方式：

| 改动 | 验证动作 | 通过标准 |
| --- | --- | --- |
| 站点配置 | 重启 `pnpm dev` 或重跑 `pnpm build` | 不再出现 `[daybook:config]`，命令退出码为 0 |
| 内容可见性 | `pnpm build` 后检查 `dist/` 对应路径 | 该生成的页面存在，`draft` 页面不存在 |
| URL 与订阅 | 打开详情页看 canonical；检查 `dist/sitemap.xml`、`dist/feed.xml` | 域名与路径正确，条目数与顺序符合预期 |
| 搜索 | `pnpm build` 后 `pnpm preview`，打开搜索面板 | 能返回结果，不再显示「索引未就绪」 |
| 评论 | 打开详情页，密码内容先解锁 | 评论区出现，对应后端请求成功 |
| 内容模式 | `pnpm dev:content` / `pnpm build:content` | 终端显示 `[daybook] 内容仓库模式：…`，页面来自内容仓库 |
| Markdown 指令 | 重新构建 | 终端没有对应 `[daybook:markdown]` 报错，区块渲染正确 |
| Termux | `pnpm fix:termux` 后 `pnpm build` | 脚本输出「均可用」，构建生成 `dist/pagefind/` |
| Meting | 构建后打开页面 | 曲目渲染并可播放，控制台无 `[daybook:meting]` 失败 |
| 图片放大 | 打开图片放大层 | 控制台无 lightGallery 授权警告 |

仓库自带的 `pnpm test` 也可以作为回归检查，但其中的构建产物断言针对仓库示例内容（示例页面数量与固定 URL）；把内容换成自己的之后断言可能失败，这不代表站点出错。部署后的检查清单见[部署指南的「部署后检查清单」](./deployment.md#部署后检查清单)。
