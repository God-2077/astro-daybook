# 参考项目与实现说明

## 参考主题

以下主题只作结构与实现思路的参考，**不是构建依赖**，也不参与 Astro / Biome / tsc / Pagefind：

| 主题 | Commit | 主要参考点 |
| --- | --- | --- |
| [astro-koharu](https://github.com/cosZone/astro-koharu) | `329ce55513a8057708c93c11c5b8c096680ad83c` | `formatInTimeZone` 日期格式化、Pagefind 加载与路径处理、加密常量组织 |
| [Firefly](https://github.com/CuteLeaf/Firefly) | `cd920b035b475fe9a6cd3a88afb42cf9440bb8a9` | `src/config/*.ts` 拆分、`SiteConfig` 类型、加密载荷（salt/iv/tag/ciphertext）、Pagefind loader 与 `pagefind.yml` |
| [Mizuki](https://github.com/LyraVoid/Mizuki) | `c06f0003089ca040d5b599b37f0ad0ae65726e95` | 配置默认值/覆盖思路、密码校验前缀、Pagefind 事件 |
| [fuwari](https://github.com/saicaca/fuwari) | `6d39b0dec41282e7852e23e032998a5789abee28` | 单文件 TS 配置、导航预设、`data-pagefind-body` 封装 |

## 借鉴点与差异

### 配置

参考 Firefly/Mizuki/fuwari 的 `src/config/*.ts` + `src/types/config.ts` 模式，但：

- 不采用 Svelte 或 Tailwind。
- 不采用 Mizuki 的 override loader：本项目直接 `defineSiteConfig()` 合并默认值并做 Zod + 语义校验。
- 配置是 TS 文件，不是 YAML。

### 日期

参考 astro-koharu 的 `date-fns-tz` 思路：

```ts
formatInTimeZone(date, timezone, 'yyyy-MM')
```

本项目额外处理了 Astro frontmatter 的 YAML 时间戳问题：`yaml` 会把无时区的 `2026-10-20 20:00:00` 解析成 UTC `Date`，无法再判断原始字符串是否带偏移量。因此 `src/lib/content/entries.ts` 通过 `entry.filePath` 重新读取原始 frontmatter，再用 `src/lib/content/date.ts` 按配置时区解析。

### 加密

参考 Firefly/Mizuki 的 PBKDF2 + AES-GCM 组合载荷：

- PBKDF2-SHA256 150,000 次
- 盐 16 字节、IV 12 字节
- 认证标签 16 字节，与密文一起 base64 存储
- 浏览器 Web Crypto 解密

差异：

- 不使用 sessionStorage 缓存密码；解锁只对当前页面有效。
- 密码页的 Pagefind 只索引标题与描述。
- 错误密码只提示固定文案，不泄露任何明文。

### Pagefind

参考 Firefly/astro-koharu 的 loader 与 `pagefind.yml`：

- 动态 `import(`${import.meta.env.BASE_URL}pagefind/pagefind.js`)`
- `pagefind.options({ excerptLength: ... })`
- `data-pagefind-body` 只放在需要索引的详情/独立页面。
- 排除 KaTeX、搜索面板、TOC、评论区、分页。

本项目改为自定义 React 搜索面板（全部/日记/文章/页面 tabs），不引入 Pagefind 默认 UI。

## 版式与样式

没有引入 Tailwind 或第二套设计系统：版式、令牌与组件样式集中在 `src/styles/`，颜色、字号、间距全部走 `daybook.css` 顶部的 CSS 变量。样式规则的完整说明见 [AGENTS.md](../AGENTS.md) 的「样式与布局说明」。

## 字体

`public/fonts/` 中的寒蝉全圆体（`ChillRoundFRegular` / `ChillRoundFBold`，cn-font-split 拆分后的子集）来自 [Warren2060/ChillRound](https://github.com/Warren2060/ChillRound) 项目，采用 OFL-1.1 许可证，可随项目一起分发。
