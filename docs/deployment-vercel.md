# 部署到 Vercel

这页把「主题仓库 + 内容仓库」的 Daybook 放到 Vercel 上：你在内容仓库里写完日记并 push，GitHub Actions 调用 Vercel 的 Deploy Hook，Vercel 重新构建并发布。全程不需要在本地安装 Vercel CLI，也不要把内容提交进主题仓库。

需要先有 GitHub 账号与 Vercel 账号，以及两个仓库（第 1 节 Fork）。通用的静态托管说明见[部署指南](./deployment.md)，分仓模式的目录、配置与限制见[双仓库](./dual-repo.md)。

## 这条链路做什么

```text
内容仓库 push ──► GitHub Actions ──► Vercel Deploy Hook ──► Vercel 构建
                                                           │
主题仓库（你的 Fork） ──► Vercel 项目 ──► pnpm content:clone 拉取内容仓库
```

- 主题仓库负责代码、页面与样式，接入 Vercel 的 Git 集成：向主题仓库的生产分支推送会自动部署。
- 内容仓库负责写作内容（`daily/`、`post/`、`pages/`、`spec/`）、静态资源 `public/` 与站点配置 `config/`。
- Vercel 不监听内容仓库。内容仓库的推送由它自己的 GitHub Action 调 Deploy Hook，触发主题仓库的一次新构建。
- 构建时 `pnpm content:clone` 把内容仓库克隆到 `content/`（默认），`pnpm build:content` 以内容模式构建并生成 Pagefind 搜索索引。

## 前置条件

- GitHub 账号与 Vercel 账号；Vercel 用 GitHub 登录并授权访问仓库。
- 主题仓库与内容仓库（第 1 节）。
- 内容仓库 `config/site.ts` 里的 `url` 已经确定：它是最终的站点地址，参与 canonical、OG、RSS 与 sitemap 的绝对链接。
- 内容仓库写作分支的名字（官方示例与默认配置使用 `main`）。
- 内容仓库已经建好并推送到远端；还没有的话，先按[双仓库](./dual-repo.md)的「第一次配置」准备。

## 1. Fork 两个仓库

1. 打开主题仓库 <https://github.com/God-2077/astro-daybook>，点右上角 **Fork**，创建到你自己的账号下。
2. 打开内容仓库 <https://github.com/God-2077/astro-daybook-content/>，同样 **Fork** 一份。
3. 如果你已经有自己的内容仓库（结构见[双仓库](./dual-repo.md)），直接用它，跳过第 2 步。

两个仓库各管什么：

- **主题仓库**：代码、页面、样式。根目录的 `content/` 被 `.gitignore` 忽略，Fork 出来的仓库里没有你的内容。
- **内容仓库**：写作内容 `post/`、`daily/`、`pages/`、`spec/`，静态资源 `public/`，以及站点配置 `config/site.ts`、`config/links.ts`。

不要把内容提交进 Fork 的主题仓库：内容由构建时的 `content:clone` 提供，主题仓库里只保留代码。

Fork 出来的仓库可见性跟随上游：官方内容仓库是公开的，所以你的 Fork 也是公开的，不能单独改成私有（见 GitHub 的 [Fork 权限与可见性](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks)）。内容不想公开时不要 Fork：新建一个私有仓库，把官方内容仓库的内容 push 或导入进去，再按第 3 节用 PAT 访问。

## 2. 改内容仓库的站点配置

打开内容仓库的 `config/site.ts`：

- `url` 改成站点最终地址：`https://<项目名>.vercel.app`，或你准备绑定的自定义域名。
- `title`、`subtitle`、`author`、`since` 等按需修改；字段全集见[配置说明](./configuration.md)。
- `config/links.ts` 的 `groups` 必填，可以是空数组。

```ts
// config/site.ts
import type { SiteConfigInput } from '../../src/types/config';

const siteConfig = {
  title: '我的日记',
  url: 'https://example.vercel.app',
  author: 'me',
} satisfies SiteConfigInput;

export default siteConfig;
```

改完提交到内容仓库（也可以和第一次推送内容一起提交）。`url` 在构建期读取，改完要重新部署才生效。

## 3. 准备克隆地址与 PAT

1. 复制内容仓库的 HTTPS 地址：打开内容仓库首页，点 **Code → Local → Clone → HTTPS**，得到 `https://github.com/<你的用户名>/<内容仓库名>.git`。

2. 内容仓库是私有的，再准备一个 Personal Access Token（PAT）：Vercel 构建时要在无交互环境里 clone，私有仓库需要 PAT 代替密码。

   - 打开 GitHub 头像 → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**。
   - **Generate new token**，填名字和过期时间（按需）。
   - **Resource owner** 选你自己；**Repository access** 选 **Only select repositories**，只勾选内容仓库。
   - **Repository permissions** → **Contents** 设为 **Read-only**，其余保持 No access。
   - **Generate token**，复制生成的值（关闭页面后不会再显示）。

   把 token 当密码拼进克隆地址：

   ```text
   https://<你的 GitHub 用户名>:<PAT>@github.com/<你的用户名>/<内容仓库名>.git
   ```

   用户名与 PAT 之间用一个英文冒号分隔，地址里的尖括号不要保留。

3. 想好两个可选变量：

| 变量 | 何时需要 |
| --- | --- |
| `CONTENT_REPO_BRANCH` | 内容仓库要用的分支不是远端默认分支时，填分支名 |
| `CONTENT_REPO_DIR` | 内容仓库克隆到主题仓库下的哪个目录，默认 `content`，一般不用改 |

要点：

- 地址里已经包含密码，只填进 Vercel 的环境变量：不要写进仓库、文档、issue 或截图。
- token 过期、被撤销或失去 Contents 读权限后，Vercel 构建会 clone 失败；重新生成并更新环境变量后重新部署一次。
- 内容仓库是公开的就不需要 PAT，直接用 `https://github.com/...` 的地址。
- 不推荐用 classic token：它需要 `repo` scope，权限覆盖你账号下的所有仓库，比 fine-grained 大得多。

## 4. 导入主题仓库

1. 打开 <https://vercel.com/new>，用 GitHub 登录并授权 Vercel 访问仓库。
2. 在列表里选 **你 Fork 的主题仓库**，点 **Import**。
3. **Root Directory** 留空（仓库根目录）；**Framework Preset** 选 Astro（平台会自动识别，没识别出来就手动选）；**Project Name** 自己取。
4. 先点 **Deploy** 完成一次默认部署。这次会用主题仓库自带的示例内容构建，属预期；项目创建后，第 5、6 节再改设置并重新部署。

## 5. 设置环境变量

项目 → **Settings** → **Environment Variables**，添加：

| 名称 | 值 | 类型 | 环境 |
| --- | --- | --- | --- |
| `CONTENT_REPO_URL` | 第 3 步拼好的 HTTPS 地址（公开仓库用普通地址） | **Secret** | 勾 Production，建议同时勾 Preview |
| `CONTENT_REPO_BRANCH` | 内容仓库分支名 | Config | 可选 |
| `CONTENT_REPO_DIR` | 默认 `content` | Config | 可选 |
| `PUBLIC_LIGHTGALLERY_LICENSE_KEY` | lightGallery 正式授权 key | Config | 可选，公开值；说明见[配置说明的「图片放大」](./configuration.md#图片放大) |

要点：

- `CONTENT_REPO_URL` 选 **Secret**：保存后不可读，之后只能覆盖。
- 不要把 PAT 放进任何 `PUBLIC_` 开头的变量。`PUBLIC_` 前缀按约定是客户端可见的公开值，本项目在 `astro.config.ts` 的 `env.schema` 里只声明了 `PUBLIC_LIGHTGALLERY_LICENSE_KEY` 一个这样的变量。
- 环境变量只影响之后的新部署；改完变量要重新部署一次。
- 本地 `.env` 不需要上传到 Vercel，Vercel 使用这里配置的同名变量。

## 6. 设置构建命令与输出目录

项目 → **Settings** → **Build and Deployment**：

| 设置项 | 值 |
| --- | --- |
| Build Command | 打开 Override，填 `pnpm content:clone && pnpm build:content` |
| Output Directory | `dist` |
| Install Command | 保持默认 `pnpm install` |
| Node.js 版本 | 选择不低于 `package.json` 里 `engines.node`（`22.23.4`）的版本 |
| Root Directory | 保持仓库根目录（第 4 步已确认） |

为什么必须覆盖 Build Command：

- 平台自动识别的构建命令不会 clone 内容仓库，只会用主题仓库自带的示例内容构建：构建会成功，但站点不是你的。
- `pnpm content:clone` 从环境变量读取 `CONTENT_REPO_URL`、`CONTENT_REPO_BRANCH`、`CONTENT_REPO_DIR`，把内容仓库克隆到目标目录（默认 `content`）。
- `pnpm build:content` 以内容模式构建，并在末尾运行 `pagefind --site dist` 生成搜索索引；`postbuild` 不会为它触发，所以不要改成 `pnpm build`。
- 不要用 `pnpm install --prod`：`content:clone` 依赖 devDependencies 里的 `tsx`，`build:content` 依赖 `pagefind`，两者都在 devDependencies。
- `pnpm content:clone` 遇到已存在的 Git 仓库会跳过且不 pull；内容更新靠第 8 节的 Deploy Hook 触发新的构建。

## 7. 重新部署并验证

环境变量与构建命令只对**新的部署**生效，所以改完必须重新部署一次。

1. 项目 → **Deployments** → 最新一条部署右侧的 **⋯** → **Redeploy**；也可以直接往主题仓库的生产分支 push 一次。
2. 打开这次部署的 **Build Logs**，确认：

   - `[daybook:content] 正在克隆内容仓库到 content …`（日志只打印目录，不打印带 token 的地址）
   - `pnpm build:content` 执行完成，Pagefind 索引生成
   - 部署状态变成 **Ready**

3. 打开 Vercel 分配的域名，确认看到的是内容仓库里的内容，并按[部署指南的「部署后检查清单」](./deployment.md#部署后检查清单)逐项验证。
4. 绑定自定义域名：项目 → **Settings** → **Domains** 添加域名，然后把内容仓库 `config/site.ts` 的 `url` 改成该域名，推送内容仓库触发重建（或手动 Redeploy）。

如果构建成功但页面还是 Daybook 的示例内容，多半是 Build Command 没有覆盖成功；如果 sitemap、RSS 或 OG 里还是占位域名，回到内容仓库改 `config/site.ts` 的 `url`。

## 8. 内容仓库推送后自动重建

到这里，只有主题仓库的推送会自动部署。内容仓库是构建时 clone 进来的，Vercel 不知道它什么时候更新，所以还需要一个 Deploy Hook。

1. 创建 Deploy Hook：项目 → **Settings** → **Git** → **Deploy Hooks**。填一个自己看得懂的名字（例如 `content-push`），**Branch** 选主题仓库的生产分支（通常是 `main`），创建后复制生成的 URL：

   ```text
   https://api.vercel.com/v1/integrations/deploy/prj_xxxxxxxx/yyyyyyyy
   ```

   URL 用 GET 或 POST 都能触发，不需要认证，也不需要请求体；它触发所选分支的一次新部署（[Vercel Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)）。Deploy Hook URL 等同凭据：拿到它的人就能触发你的部署。不要提交到仓库或贴进公开日志；泄露后在同一个页面撤销，再重新创建一个。

2. 在内容仓库添加 Secret：打开内容仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**，Name 填 `VERCEL_DEPLOY_HOOK`，Secret 填第 1 步复制的 URL。保存后无法再查看原值，只能覆盖更新。

3. 在内容仓库添加 workflow 文件 `.github/workflows/deploy-vercel.yml`。官方内容仓库已经带有这个文件，其中 `push` 触发默认被注释、只保留手动触发；取消 `push` 的注释并确认分支名，推送才会自动调用 Hook。文件内容：

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deploy Hook
        env:
          VERCEL_DEPLOY_HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK }}
        run: |
          code=$(curl -sS -o /tmp/hook.json -w '%{http_code}' -X POST "$VERCEL_DEPLOY_HOOK")
          echo "Deploy Hook HTTP status: $code"
          if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
            cat /tmp/hook.json
            exit 1
          fi
```

逐行说明：

- `name`：workflow 名称，显示在 Actions 列表里。
- `on.push.branches`：只有这些分支的推送才触发；按内容仓库的实际分支改。
- `workflow_dispatch`：允许在 Actions 页面手动运行一次。
- `runs-on`：使用 GitHub 托管的 Ubuntu 运行器。
- `env.VERCEL_DEPLOY_HOOK`：从内容仓库的 Secret 读取；Secret 不会写进日志。
- `curl` 那一行：用 POST 调用 Hook，响应体写入 `/tmp/hook.json`，只把 HTTP 状态码存进 `code`。
- `echo` 那一行：打印状态码，不打印 URL。
- `if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]`：非 2xx 视为失败，打印响应体便于排查，并以非 0 退出，Actions 显示为失败。

4. 如果内容仓库是 Fork 出来的，第一次打开 **Actions** 页面可能提示 *Workflows aren't being run on this forked repository*，点 **I understand my workflows, go ahead and enable them** 启用；否则 push 不会触发。

5. 验证整条链路：在内容仓库写一篇日记，commit 并 push 到该分支。预期：Actions 页面里 workflow 变绿 → Vercel 项目的 **Deployments** 出现一次新部署 → 状态 Ready 后刷新站点看到新内容。

如果 Actions 变绿但 Vercel 没有出现新部署，检查 Actions 是否跑在你推送的分支上、Hook 的 Branch 是否选的是主题仓库的生产分支、Hook 是否被撤销。

## 9. 日常写作流程

1. 在内容仓库写或改内容（`daily/`、`post/`、`pages/`、`spec/`），要改站点配置就改 `config/`。
2. commit 并 push 到内容仓库的生产分支。
3. 该分支的 GitHub Actions 调用 Deploy Hook。
4. Vercel 重新构建并发布，Deployments 里能看到新记录。

本地预览用 `pnpm dev:content`，更新内容用 `pnpm content:pull`，具体见[双仓库](./dual-repo.md)。

主题仓库有改动（样式、路由、依赖）时，push 主题仓库即可：Vercel 已经接入它的 Git，不需要 Deploy Hook。不要在 Vercel 网页上直接改内容——下次构建会覆盖掉。

## 常见失败

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 构建日志提示缺少 `CONTENT_REPO_URL` | 变量没加到当前环境，或加完没有重新部署 | 检查变量是否勾选了 Production 环境，改完重新部署一次 |
| clone 失败，提示认证失败或仓库不存在 | PAT 过期、被撤销、没有 Contents 读权限，或 URL 里的用户名、仓库名写错 | 重新生成 PAT，更新 `CONTENT_REPO_URL` 后重新部署；私有仓库必须带 PAT |
| 构建日志出现「内容仓库已存在：content，跳过克隆。」，但内容没更新 | 构建目录里已有旧的 Git 仓库，`content:clone` 跳过且不 pull | 重新部署并让构建目录重新开始，或把 Build Command 改成 `rm -rf content && pnpm content:clone && pnpm build:content` |
| 构建成功，但站点还是示例内容 | Build Command 仍是 `pnpm build` 或 `astro build` | 改成 `pnpm content:clone && pnpm build:content` 后重新部署 |
| 站内搜索没有结果 | 构建命令里没有生成 Pagefind 索引，或输出目录不是 `dist` | 保持 `pnpm build:content`，Output Directory 填 `dist` |
| 内容仓库 push 后 Vercel 没有新部署 | GitHub Actions 没有运行（Fork 未启用 workflow、分支不匹配），或 Hook 被撤销 | 看内容仓库的 Actions 与 Vercel 的 Deployments；检查 workflow 的分支与 Hook 的 Branch |
| sitemap、RSS、OG 里还是占位域名 | 内容仓库 `config/site.ts` 的 `url` 没改 | 改完推送到内容仓库，触发重建 |
| 浏览器控制台出现 not-for-production 警告（lightGallery） | 没有配置 `PUBLIC_LIGHTGALLERY_LICENSE_KEY` | 在 Vercel 环境变量里加入正式 key 后重新部署 |
| 每次构建都比较久 | 每次都会重新 clone 内容仓库并生成搜索索引 | 正常现象 |

## 参考

- [Vercel Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)
- [Vercel 环境变量](https://vercel.com/docs/projects/environment-variables)
- [Vercel 构建配置](https://vercel.com/docs/deployments/configure-a-build)
- [GitHub：管理 Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub：Fork 的权限与可见性](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks)
- [GitHub Actions：使用 Secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

相关页面：[部署指南](./deployment.md)、[双仓库](./dual-repo.md)、[配置说明](./configuration.md)、[排错](./troubleshooting.md)、[文档索引](./README.md)。
