# PR-Agent 代码审查

这页说明如何用 GitHub Actions 接入 PR-Agent，让维护者在 PR 评论里手动触发审查、描述和提问，模型使用 DeepSeek。

> 适用于 PR-Agent v0.50.0 与 DeepSeek V4 API（2026-11）。

## 前置条件

- 仓库已启用 GitHub Actions。
- 默认分支为 `main`。`issue_comment` 工作流和 `.pr_agent.toml` 都从默认分支读取，放在其他分支不会生效。
- 已在 DeepSeek 开放平台创建 API key，地址见 <https://platform.deepseek.com/api_keys>。
- 触发者拥有仓库的 `OWNER`、`MEMBER` 或 `COLLABORATOR` 权限。

## 启用

1. 打开仓库的 `Settings > Secrets and variables > Actions`，新建 secret：

   ```text
   Name: DEEPSEEK_API_KEY
   Secret: <你的 DeepSeek API key>
   ```

2. 确认以下文件位于 `main` 分支：

   ```text
   .github/workflows/pr-agent.yml
   .pr_agent.toml
   ```

3. 打开一个测试 PR，在会话评论里输入：

   ```text
   /help
   ```

   预期结果是 `github-actions` 机器人回复命令列表。再输入 `/describe` 或 `/review` 验证模型调用。

## 可用命令

在 PR 的会话评论区输入以下命令：

| 命令 | 作用 |
| --- | --- |
| `/review` | 审查 PR，给出问题、安全、测试等反馈 |
| `/describe` | 生成 PR 类型、摘要和变更说明 |
| `/improve` | 生成代码改进建议；内部会运行 `/review` |
| `/ask "问题"` | 针对 PR 内容提问 |
| `/help` | 查看可用命令 |
| `/config` | 查看可配置项 |

命令可以带参数覆盖单次配置，例如：

```text
/review --pr_reviewer.extra_instructions="重点检查样式约定"
```

当前工作流只监听 `issue_comment` 事件，因此只响应 PR 会话评论；行内 review comment 里的 `/ask` 不会触发。

## 配置

仓库级配置写在 `.pr_agent.toml`，从默认分支读取，合并到 `main` 之前不会生效。

```toml
[config]
model = "deepseek/deepseek-flash"
fallback_models = []
response_language = "zh-CN"

[pr_reviewer]
enable_review_labels_effort = false
enable_review_labels_security = false
```

- `model`：默认 `deepseek/deepseek-flash`。需要更强审查时改为 `deepseek/deepseek-v4-pro`；若模型不在 PR-Agent 的 token 表里，再补 `custom_model_max_tokens = 1000000`。
- `fallback_models`：留空表示主模型失败时不切换模型。可以改成其他 DeepSeek 模型作为备份。
- `response_language`：模型输出的语言。PR-Agent 的固定文案目前只有 en/es 语言包，所以中文回复里少量标签仍可能显示英文。
- `enable_review_labels_*`：关闭 `/review` 自动添加 effort 和 security 标签，避免仓库被自动创建标签。

PR-Agent 默认会把根目录 `AGENTS.md` 作为仓库上下文（`repo_context_files = ["AGENTS.md"]`，从默认分支读取，最多 500 行），不需要在 `.pr_agent.toml` 里重复配置仓库规范。

需要在评论里查看模型、token 和耗时，可以执行：

```text
/review --config.output_run_details=true
```

## 权限、费用与安全

- 工作流只允许 `OWNER`、`MEMBER`、`COLLABORATOR` 触发，且忽略 Bot 评论，避免公开仓库被随意消耗 API 额度。
- `GITHUB_TOKEN` 只声明最小权限：`contents: read`、`issues: write`、`pull-requests: write`。默认命令不需要写仓库内容。
- PR 的 diff 和仓库上下文会发送给 DeepSeek。不要在 PR 或 `AGENTS.md` 里放置密钥、token 等敏感信息。
- 工作流只监听评论，不会在 PR 打开或 push 时自动运行；每条命令产生的费用由 DeepSeek 按官方计费规则收取。
- `.pr_agent.toml` 会随仓库公开，只放模型名和审查配置；API key 只放在 Actions secret 里。
- 工作流把 secret `DEEPSEEK_API_KEY` 映射为 PR-Agent 的 `DEEPSEEK__KEY` 环境变量。

## 排错

| 症状 | 原因与处理 |
| --- | --- |
| 评论后没有反应 | 确认工作流和 `.pr_agent.toml` 已在 `main`、Actions 已启用、评论者是维护者、评论在 PR 会话区而不是普通 issue |
| 日志提示 `Incorrect API key provided: dummy_key` | secret 名称写错或值为空；确认 Actions secret 名称是 `DEEPSEEK_API_KEY` |
| 返回 429 或限流 | 在 `.pr_agent.toml` 的 `[config]` 里设置 `fallback_models`；仍失败时查看 Actions 日志里的限流信息 |
| Docker 镜像拉取失败 | Docker Hub 限流或网络问题；稍后重试，并确认工作流里的 PR-Agent 版本 tag 有效 |
| 修改 `.pr_agent.toml` 后行为没变 | 配置从默认分支读取，先合并到 `main` 再触发命令 |
| 中文回复里仍有英文标签 | PR-Agent 固定文案的语言包限制，模型正文仍为中文 |
| fork 提交的 PR 能否手动触发 | 可以。`issue_comment` 在基仓库上下文运行，能读取基仓库 secrets；当前不需要 `pull_request_target` |

更多命令参数与配置说明见 [PR-Agent 文档](https://docs.pr-agent.ai/usage-guide/automations_and_usage/) 和 [模型配置](https://docs.pr-agent.ai/usage-guide/changing_a_model/)。

## 停用与升级

- 停用：删除 `.github/workflows/pr-agent.yml`，或在 Actions 页面禁用 `PR Agent` 工作流；不再使用时删除 `DEEPSEEK_API_KEY` secret。
- 升级：修改工作流里的版本号，例如 `the-pr-agent/pr-agent@v0.50.0`。升级前先看 [PR-Agent Releases](https://github.com/The-PR-Agent/pr-agent/releases)。
- 需要固定运行时镜像时，可以把 `uses` 改为 Docker 引用，例如 `docker://pragent/pr-agent:0.50.0-github_action`；也可以使用镜像 digest。
