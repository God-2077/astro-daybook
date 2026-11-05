# 用 Vercel 自动部署 Daybook

这篇教程把「主题仓库 + 内容仓库」的 Daybook 放到 Vercel 上：你在内容仓库里写完日记、`git push`，GitHub Actions 会调用 Vercel 的 Deploy Hook，让 Vercel 重新构建并发布，不需要在本地跑构建。

整体链路：

```text
内容仓库 push ──► GitHub Actions ──► Vercel Deploy Hook ──► Vercel 构建
                                                              │
主题仓库（你的 Fork） ──► Vercel 项目 ──► pnpm content:clone 拉取内容仓库
```

主题仓库与内容仓库的分工、内容目录结构、本地如何 clone，见 [`dual-repo.md`](./dual-repo.md)；其它托管平台的通用说明见 [`configuration.md` 的「部署」](./configuration.md#部署)。

**准备**：GitHub 账号、Vercel 账号，以及下面要 Fork 的两个仓库。全程不需要在本地安装 Vercel CLI。

## 1. Fork 主题仓库和内容仓库

1. 打开主题仓库 <https://github.com/God-2077/astro-daybook>，点右上角 **Fork**，创建到你自己的账号下。
2. 打开内容仓库 <https://github.com/God-2077/astro-daybook-content>，同样 **Fork** 一份（如果内容不想公开，见本节末尾的私有仓库做法）。
3. 如果你已经有自己的内容仓库（目录结构见 [`dual-repo.md`](./dual-repo.md#内容仓库结构)），直接用它，跳过第 2 步。

两个仓库各管什么：

- **主题仓库**：代码、页面、样式。根目录的 `content/` 被 `.gitignore` 忽略，Fork 出来的仓库里没有你的内容。
- **内容仓库**：写作内容 `post/`、`daily/`、`pages/`、`spec/`，以及站点配置 `config/site.ts`、`config/links.ts`。

Fork 完先改内容仓库的 `config/site.ts`：

- `url` 改成站点最终的真实地址，例如 `https://你的站点.vercel.app` 或自定义域名。它参与 canonical、RSS、sitemap 与 OG 的绝对链接，占位值会让这些输出全错。
- `title`、`subtitle`、`author` 等按需修改。

改完先提交到内容仓库（也可以在第一次推送内容时一起提交）。

Fork 出来的仓库可见性跟随上游：官方内容仓库是公开的，所以你的 Fork 也是公开的，而且不能单独改成私有。如果内容不想公开，不要 Fork——新建一个**私有仓库**，把官方内容仓库的内容 push 进去（或使用 GitHub 的 Import repository），再按第 2 节配置 PAT。

## 2. 获取内容仓库地址和 PAT（推荐）

### 2.1 复制内容仓库的 HTTPS 地址

打开你的内容仓库首页，点 **Code → Local → Clone → HTTPS**，得到：

```text
https://github.com/<你的用户名>/<内容仓库名>.git
```

### 2.2 私有内容仓库需要 PAT

Vercel 构建时要在无交互环境里 clone 内容仓库。仓库是公开的直接用上面的地址即可；私有的需要 Personal Access Token（PAT）代替密码。推荐使用 fine-grained token，权限只给这一个仓库：

1. 点 GitHub 头像 → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**。
2. **Generate new token**，填名字和过期时间（按需，建议不超过 90 天）。
3. **Resource owner** 选你自己；**Repository access** 选 **Only select repositories**，只勾选内容仓库。
4. **Repository permissions** → **Contents** 设为 **Read-only**，其余保持 No access。
5. **Generate token**，复制生成的值（关掉页面后不会再显示）。

然后把 token 当密码拼进克隆地址：

```text
https://<你的 GitHub 用户名>:<PAT>@github.com/<你的用户名>/<内容仓库名>.git
```

- 用户名和 PAT 之间用一个英文冒号分隔，形如 `https://用户名:PAT@github.com/...`，尖括号不要保留。
- 地址里已经包含密码，只填进 Vercel 的环境变量：不要写进仓库、文档、issue 或截图。
- token 过期、被撤销或失去 Contents 读权限后，Vercel 构建会 clone 失败；重新生成并更新环境变量后，再重新部署一次。
- 内容仓库如果公开，不需要 PAT，直接用 `https://github.com/...` 的地址。

不推荐用 classic token：它需要 `repo` scope，权限覆盖你账号下的所有仓库，比 fine-grained 大得多。

### 2.3 想好这两个可选变量

| 变量 | 何时需要 |
| --- | --- |
| `CONTENT_REPO_BRANCH` | 内容仓库要用的分支不是默认分支时，填分支名 |
| `CONTENT_REPO_DIR` | 内容 clone 到主题仓库下的哪个目录，默认 `content`，一般不用改 |

## 3. 部署到 Vercel

### 3.1 导入主题仓库

1. 打开 <https://vercel.com/new>，用 GitHub 登录并授权 Vercel 访问仓库。
2. 在列表里选 **你 Fork 的主题仓库**，点 **Import**。
3. Framework Preset 会自动识别为 Astro，保持默认；Root Directory 留空（仓库根目录）；Project Name 自己取。
4. 先点 **Deploy** 完成一次默认部署。Vercel 只有在部署之后才会创建项目、才有 Settings 页面；这次部署用的是主题仓库自带的示例内容，属于预期，下一步改完设置后会重新部署。

### 3.2 设置环境变量

项目 → **Settings** → **Environment Variables** → 添加：

| 名称 | 值 | 类型 / 环境 |
| --- | --- | --- |
| `CONTENT_REPO_URL` | 2.2 拼好的带 PAT 的 HTTPS 地址（公开仓库用普通地址） | **Secret**；Environment 勾 **Production**，建议同时勾 **Preview** |
| `CONTENT_REPO_BRANCH` | 内容仓库分支名 | 可选；Config |
| `CONTENT_REPO_DIR` | 默认 `content` | 可选；Config |
| `PUBLIC_LIGHTGALLERY_LICENSE_KEY` | lightGallery 正式授权 key | 可选；Config（公开值，见 [`configuration.md`](./configuration.md#图片放大)） |

要点：

- `CONTENT_REPO_URL` 选 **Secret**：保存后不可读，构建日志里也会打码。
- 不要给 `CONTENT_REPO_URL` 加 `PUBLIC_` 前缀。`PUBLIC_` 前缀的变量会被暴露给客户端代码；本项目只声明了 `PUBLIC_LIGHTGALLERY_LICENSE_KEY` 这一个公开变量，PAT 不能走这条路。
- 环境变量只影响**之后的新部署**；改完变量记得重新部署一次。
- 本地 `.env` 不需要上传到 Vercel，Vercel 用这里的同名变量。

### 3.3 设置构建命令和输出目录

项目 → **Settings** → **Build and Deployment**：

| 设置项 | 值 |
| --- | --- |
| Build Command | 打开 Override，填 `pnpm content:clone && pnpm build:content` |
| Output Directory | `dist` |
| Install Command | 保持默认 `pnpm install` |
| Node.js Version | 默认 24.x 即可（`package.json` 要求 `>=22.23.4`） |

另外确认 **Settings → Git** 里的 Production Branch 是 `main`：Vercel 默认部署这个分支，第 4 步的 Deploy Hook 也选它。

为什么必须覆盖 Build Command：

- Vercel 自动检测出的构建命令不会 clone 内容仓库，而是直接用主题仓库自带的示例内容构建——构建会成功，但站点不是你的。
- Build Command 先用 `pnpm content:clone` 拉取内容仓库，再用 `pnpm build:content` 以内容模式构建并生成 Pagefind 搜索索引；`build:content` 脚本本身不包含 clone。不要另外加 `postbuild`，也不要直接用 `astro build`。
- 内容模式下 `CONTENT_REPO` 由 `--content` 自动设好，不需要手动配置。
- `pnpm install` 会安装 devDependencies，`tsx`、`pagefind` 都在里面；不要改成 `pnpm install --prod`。

### 3.4 重新部署并验证

环境变量和构建命令都只对**新的部署**生效，所以改完必须重新部署一次：项目 → **Deployments** → 最新一条部署右侧的 **⋯** → **Redeploy**（也可以直接往主题仓库 push 一次）。

在 Build Logs 里确认：

1. `pnpm content:clone` 拉取内容仓库（日志只显示目录，不会回显带 token 的地址）。
2. `pnpm build:content` 完成构建并生成 `dist/`。
3. 部署状态变成 **Ready**，访问 Vercel 给的域名，看到的应该是内容仓库里的内容。

如果构建成功但页面还是 Daybook 的示例内容，多半是 Build Command 没有覆盖成功；如果 sitemap、RSS 或 OG 里还是占位域名，回到内容仓库改 `config/site.ts` 的 `url` 后重新部署。

想绑定自定义域名：项目 → **Settings** → **Domains** 添加域名，然后把内容仓库 `config/site.ts` 的 `url` 同步改成该域名。

## 4. Deploy Hook + 内容仓库的 GitHub Action

到这里，只有**主题仓库**的推送会自动部署。内容仓库是构建时 clone 进来的，Vercel 并不知道它什么时候更新，所以还需要一个 Deploy Hook。

### 4.1 获取 Vercel Deploy Hook

项目 → **Settings** → **Git** → **Deploy Hooks**：

1. Name 填一个容易识别的名字，例如 `content-push`。
2. Branch 选 `main`（Vercel 项目要部署的分支，也就是主题仓库的生产分支）。
3. 点添加按钮创建 hook（按钮文案可能略有差异，如 **Add**），复制生成的 URL：

```text
https://api.vercel.com/v1/integrations/deploy/prj_xxxxxxxx/yyyyyyyy
```

这个 URL 用 GET 或 POST 都能触发，不需要认证，也不需要请求体；它触发的是所选分支的**最新 commit**，并重新运行构建。默认会复用 Build Cache。

Deploy Hook URL 等同于凭据：拿到它的人就能触发你的部署，不要提交到仓库或贴进公开日志。如果泄露，在同一个页面撤销（Revoke）后重新创建一个。Hobby 账号每个项目最多 5 个 hook，每小时最多触发 60 次，个人博客的更新频率完全够用。

### 4.2 在内容仓库添加 Secret

打开内容仓库 → **Settings** → **Security** → **Secrets and variables** → **Actions** → **New repository secret**：

- Name：`VERCEL_DEPLOY_HOOK`
- Secret：粘贴 4.1 复制的 URL

保存后无法再查看原值，只能覆盖更新。

### 4.3 新建 GitHub Action

在内容仓库根目录新建 `.github/workflows/deploy-vercel.yml`：

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

说明：

- 如果内容仓库是 Fork 出来的，第一次打开 **Actions** 页面可能提示 *Workflows aren't being run on this forked repository*，点 **I understand my workflows, go ahead and enable them** 启用；否则 push 不会触发。
- `branches: [main]` 按内容仓库的实际分支改；`workflow_dispatch` 让你可以在 Actions 页面手动跑一次。
- 只打印状态码，不要 `echo` URL 本身；GitHub 会遮盖已知 secret，但不保证所有场景。
- 这个 workflow 只发一个 HTTP 请求，不需要 `GITHUB_TOKEN` 或额外权限。
- 文件提交后第一次运行，之后每次推送到该分支都会触发。

### 4.4 验证与日常写作

1. 在内容仓库写一篇日记，commit 并 push。
2. 内容仓库的 **Actions** 页面里 workflow 变绿。
3. Vercel 项目的 **Deployments** 出现一次新部署，Ready 后刷新站点即可看到新内容。

第一次配置完成后，建议就按这三步实际 push 一次验证整条链路；如果内容仓库的 Actions 变绿但 Vercel 没有出现新部署，先检查 Actions 是否真的跑在你推送的分支上、hook 的 Branch 是否选的是主题仓库的生产分支（`main`），再看本节最后的 Ignored Build Step 说明。

主题仓库的改动不需要这个 Action：Vercel 已经接入主题仓库的 Git，`main` 分支的推送本来就会触发部署。Deploy Hook 只解决「内容仓库推送后重建」这一件事。

如果之后在 Vercel 里配置了 **Ignored Build Step**（例如只在实际有文件变化时构建），内容推送可能被跳过；个人站点保持默认的 Automatic 即可。

## 5. 常见问题

| 现象 | 排查 |
| --- | --- |
| 构建日志提示缺少 `CONTENT_REPO_URL` | 变量没加到当前环境，或加完没有重新部署 |
| clone 时报认证失败 | PAT 过期 / 被撤销 / 没有 Contents 读权限 / URL 里用户名或仓库名写错；重新生成 PAT，更新变量后重新部署 |
| 构建成功，但站点还是示例内容 | Build Command 仍是 `pnpm build` / `astro build`，改成 `pnpm content:clone && pnpm build:content` 后重新部署 |
| 站内搜索没结果 | 用了 `astro build`，或构建命令里删掉了 Pagefind；保持 `pnpm build:content`，输出目录填 `dist` |
| 内容 push 后 Vercel 没有新部署 | 看 Actions 是否执行、Hook 是否被 Revoke、Vercel Deployments 列表、Ignored Build Step，以及 Hobby 每天 100 次部署的限额 |
| sitemap、RSS、OG 链接是占位域名 | 内容仓库 `config/site.ts` 的 `url` 没改 |
| 浏览器控制台提示 lightGallery not for production | 可选：设置 `PUBLIC_LIGHTGALLERY_LICENSE_KEY` |
| 每次构建都比较久 | 每次都会重新 clone 内容仓库并生成搜索索引，属正常 |

## 参考

- [Vercel Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Build 配置](https://vercel.com/docs/deployments/configure-a-build)
- [GitHub：管理 Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub：Fork 的权限与可见性](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks)
- [GitHub Actions：使用 Secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
