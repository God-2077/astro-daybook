# Meting API 客户端

`@mdx` 内置了 [Meting-API](https://github.com/liuran001/meting-api) 客户端，用于在 MDX 里按查询取歌曲、歌单、专辑、歌词与封面，或者直接把查询渲染成 `MusicPlayer`。这页是参考页：查配置、返回值、参数、构建期缓存与失败行为。动手前先看 [配置说明](../configuration.md) 的 `mdx` 分组和 [音乐播放器](../music-player.md) 的组件用法。适用于仓库 `main` 分支当前代码（`package.json` 1.2.1）。

## 这页管什么

两种运行位置，共用同一套 URL 构造与归一化逻辑：

| 入口 | 运行位置 | 服务端缓存 |
| --- | --- | --- |
| `@mdx` 的 `meting.fetchMusic()` / `meting.request()` | 构建期（Node） | 使用 |
| `@mdx` 的 `meting.player({ client: false })` | 构建期 | 使用 |
| `@mdx` 的 `meting.player()`（`client` 默认 `true`） | 浏览器 | 不使用 |
| `@mdx/client` | 浏览器 | 不使用 |

`@mdx` 用于 `.mdx` 内容，`@mdx/client` 用于浏览器脚本或客户端组件。Markdown 里的 `::meting` 指令是 `player()` 的语法糖，只支持 `song`、`playlist`、`albumlist`，并且始终在浏览器端取数；指令语法见 [Markdown 增强](../markdown.md#音乐播放器)。

## 配置

在 `src/config/site.ts` 的 `mdx.meting` 下配置；内容模式写在 `<内容根>/config/site.ts`。所有字段都可以省略，由 `src/config/defaults.ts` 补默认值；仓库自带的 `src/config/site.ts` 显式写了这些默认值。

| 字段 | 类型 | 默认值 | 约束与行为 |
| --- | --- | --- | --- |
| `mdx.meting.api` | `string` | `'https://163.hyc.moe/'` | Meting-API 基础地址；必须是 `http` 或 `https` 地址，不能带 query 或 hash，否则启动时报配置错误 |
| `mdx.meting.timeout` | `number` | `5000` | 单次请求超时，单位毫秒；必须是正整数 |
| `mdx.meting.cache.enabled` | `boolean` | `true` | 构建期缓存开关；`false` 时不读也不写缓存 |
| `mdx.meting.cache.ttl.playlist` | `number` | `86400000`（1 天） | `playlist` 的缓存时间，单位毫秒；非负整数，`0` 表示该类型不缓存 |
| `mdx.meting.cache.ttl.search` | `number` | `86400000`（1 天） | `search` 的缓存时间，单位毫秒；非负整数，`0` 表示该类型不缓存 |
| `mdx.meting.cache.ttl.default` | `number` | `2592000000`（30 天） | 其它类型的缓存时间，单位毫秒；非负整数，`0` 表示不缓存 |

`api` 校验失败时启动即中断，错误格式：

```text
[daybook:config] src/config/site.ts > mdx.meting.api
  ftp://example.com 不是合法的 http(s) 地址（不能带 query/hash）
```

单次调用可以在第二个参数里覆盖 `api` / `timeout`，也可以关掉或换掉缓存，见下一节的选项表。

## 导入与最小示例

```mdx
import { meting } from '@mdx';

export const song = await meting.fetchMusic({
  server: 'netease',
  type: 'song',
  id: '1969519579',
});

歌名：{song.name}
```

`@mdx` 同时提供具名导出，两种写法等价：

```mdx
import { fetchMusic, player, request } from '@mdx';
```

构建期的 `fetchMusic()` / `request()` / `player({ client: false })` 会发真实请求，构建机必须能访问 `api`；请求失败会让构建失败。

构建期入口的第二个参数：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `api` | `string` | `mdx.meting.api` | 覆盖接口地址 |
| `timeout` | `number` | `mdx.meting.timeout` | 覆盖超时，单位毫秒 |
| `signal` | `AbortSignal` | — | 外部取消信号，与超时合并 |
| `headers` | `Record<string, string>` | — | 额外请求头 |
| `cache` | `boolean` | `mdx.meting.cache.enabled` | 单次关闭或开启缓存，仅构建期生效 |
| `cacheFile` | `string` | `resolveMetingCacheFile()` | 覆盖缓存文件路径，仅构建期生效 |

浏览器端入口的选项只有 `api` / `timeout` / `signal` / `headers`，没有缓存选项。

## fetchMusic 返回什么

`fetchMusic()` 先取原始响应，再按 `type` 归一化：

| `type` | 返回 |
| --- | --- |
| `song` | 单个 `MetingTrack` |
| `playlist` / `albumlist` / `search` | `MetingTrack[]` |
| `name` / `artist` / `album` / `lrc` | `string` |
| `url` / `pic` | `string`：构建期是 302 的 `Location` 目标，浏览器端是接口地址 |
| `debug` | 原始对象，不做归一化 |

`MetingTrack` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | 曲名 |
| `artist` | `string` | 艺人；可能为空字符串 |
| `album` | `string` | 专辑 |
| `source` | `string` | 数据源 |
| `url` | `string` | 播放地址；可能为空字符串 |
| `pic` | `string` | 封面地址 |
| `cover` | `string` | `pic` 的别名，两者相同 |
| `lrc` | `string` | 歌词地址；内容本身是 LRC 文本 |
| `raw` | `object` | 服务端返回的原始对象，保留 `album_artist`、`year` 等未归一化字段 |

归一化的细节：

- 读取 `pic` 时优先用响应里的 `pic`，没有才用 `cover`，两个字段都为空时保留空字符串。
- `api` 是 HTTPS、而媒体地址是同一 host 的 HTTP 地址时，会自动升级为 HTTPS，避免浏览器拦截混合内容。
- 列表接口返回的不是数组、或者数组某项不是对象时直接抛错，不会跳过坏数据。

取歌词用 `type: 'lrc'`，返回纯文本，不是 JSON：

```mdx
import { meting } from '@mdx';

export const lyrics = await meting.fetchMusic({
  server: 'netease',
  type: 'lrc',
  id: '1969519579',
});

<pre>{lyrics}</pre>
```

也可以先取 `song`，再用 `song.lrc` 里的地址取歌词文本；它是歌词接口地址，返回内容由 Meting-API 决定。

## 渲染播放器

`meting.player()` 把查询渲染成 `MusicPlayer`。查询字段与 `fetchMusic()` 相同，另外接受播放器选项：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `client` | `boolean` | `true` | `true` 在浏览器取数；`false` 在构建期取数并输出可播放曲目 |
| `autoPlayNext` | `boolean` | `false` | 一首播完是否自动播下一首 |
| `playlistExpand` | `boolean` | `false` | 是否默认展开播放列表 |

```mdx
{await meting.player({
  server: 'netease',
  type: 'playlist',
  id: '8900628861',
  client: false,
  autoPlayNext: true,
  playlistExpand: true,
})}
```

`type` 只支持 `song`、`playlist`、`albumlist`、`search`；文本与重定向类型没有曲目可渲染。

- `client: false`：构建期请求并归一化，要求至少一条曲目且每条都有 `url`；不满足时抛 `[daybook:meting] type=… 没有返回可播放的曲目` 或 `[daybook:meting] 曲目「…」没有可播放地址`，构建失败。
- `client: true`（默认）：构建期只校验查询参数（缺 `id`、`search` 缺 `keyword` 会直接报错），输出播放器空壳与 `data-meting-source`（包含查询与可选的 `api` / `timeout`），浏览器取数后填入曲目。构建产物里没有曲目数据。
- 浏览器取数失败时卡片标题变为「音乐加载失败」，控制台输出一条 `[daybook:meting] 客户端加载失败：…`；没有 JavaScript 时只保留加载空壳。
- `client: true` 渲染的组件等价于把查询作为 `MusicPlayer` 的 `metingSource`；`metingSource` 的字段见 [音乐播放器](../music-player.md)。
- 播放器的 Props、播放行为、歌词与资源位置见 [音乐播放器](../music-player.md)，这里不重复。

## 浏览器端 fetch API

`@mdx/client` 适合自定义脚本或 React/Astro 客户端组件：

```ts
import { meting } from '@mdx/client';

const song = await meting.fetchMusic({
  server: 'netease',
  type: 'song',
  id: '1969519579',
});

const playlist = await meting.request({
  server: 'netease',
  type: 'playlist',
  id: '8900628861',
});

const client = meting.createMetingClient({ api: 'https://music.example/meting/', timeout: 8000 });
```

- 返回结构与构建期相同；`request()` 不归一化。
- 默认 `api` 与 `timeout` 来自页面的 `<html data-meting-api data-meting-timeout>`，由 `src/layouts/BaseLayout.astro` 按 `mdx.meting` 输出；`createMetingClient()` 或单次调用的 `{ api, timeout, signal, headers }` 可以覆盖。
- 没有本地缓存，每次调用都会请求；浏览器 HTTP 缓存仍然可能生效。
- `url` / `pic` 直接返回接口地址，不解析 302；`<audio>` / `<img>` 会自行跟随重定向。
- 浏览器直连 Meting-API，要求接口返回 `Access-Control-Allow-Origin`；项目没有 `/api/meting` 之类的服务端路由或代理。

## 服务端缓存

构建期请求默认写入缓存文件：

- 主题模式：`.cache/meting-api-data.json`
- 内容模式：`<内容根>/cache/meting-api-data.json`（默认内容仓库是 `content/cache/meting-api-data.json`）

文件结构：

```text
{
  version: 1,
  entries: {
    "<去掉 refresh 的完整请求 URL>": { type, timestamp, data }
  }
}
```

- 缓存键是完整请求 URL，只去掉 `refresh` 参数；`server`、`type`、`id`、`format` 等任何参数不同就是另一条缓存。
- TTL 按类型取：`playlist` 用 `ttl.playlist`，`search` 用 `ttl.search`，其余用 `ttl.default`；对应 TTL 为 `0` 时该类型不缓存。
- `refresh: true` 跳过缓存读取；缓存开启时，请求成功后仍会写回缓存。
- 同一进程内，相同缓存文件与缓存键的并发请求会合并成一个；多个页面同时用同一查询时只发一次请求。
- 写入是原子的：先写 `<文件>.<pid>.<随机串>.tmp`，再 `rename` 覆盖目标文件；目录不存在会先创建。
- 读取失败、文件损坏、写入失败都只输出一次 `[daybook:meting]` 警告，不阻断构建；损坏文件按空缓存重新生成。
- 单次调用可以用 `cache: false` 关闭缓存，或用 `cacheFile` 指定别的文件（主要用于测试与特殊部署）。
- 浏览器播放器不读这个缓存，浏览器侧的请求每次都会发出。
- 主题仓库的 `.gitignore` 里 `.cache/*` 被忽略，但 `meting-api-data.json` 用 `!.cache/meting-api-data.json` 排除了，这个缓存文件没有被忽略；使用独立内容仓库时把 `cache/` 加进内容仓库的 `.gitignore`。
- `auth` 参数会进入请求 URL，也会进入缓存键，不要把一次性签名长期留在缓存文件里。

## 覆盖全部接口

`meting.request()` 返回接口原始结果，不做曲目归一化：JSON 类型解析为对象或数组，文本类型返回字符串，`url` / `pic` 在构建期返回重定向目标、在浏览器端返回接口地址。

```mdx
// JSON 类型 → 解析后的对象或数组
export const playlist = await meting.request({
  server: 'netease',
  type: 'playlist',
  id: '8900628861',
});

// 文本类型 → 字符串
export const lyric = await meting.request({
  server: 'netease',
  type: 'lrc',
  id: '1969519579',
  format: 'lrc',
});

// url / pic → 302 的 Location
export const audio = await meting.request({
  server: 'netease',
  type: 'url',
  id: '1969519579',
  br: 320,
});
```

支持的 `type`：`song`、`playlist`、`albumlist`、`search`、`name`、`artist`、`album`、`url`、`pic`、`lrc`、`debug`。

## 参数表

`server` 默认 `netease`；`id` 在除 `debug` 外的类型中必填，`search` 省略时自动填 `0`。查询字段名与发给接口的参数名大多一致，两列不同时以「实际参数」列为准。

| 查询字段 | 实际参数 | 适用 `type` | 说明 |
| --- | --- | --- | --- |
| `server` | `server` | 全部 | 数据源，默认 `netease`；常见值 `tencent`、`kugou`，实际支持由 API 决定 |
| `type` | `type` | 全部 | 必填，取值见上一节 |
| `id` | `id` | 除 `debug` 外 | 单曲、歌单、专辑或封面 ID；`search` 省略时发送 `0` |
| `keyword` | `keyword` | `search` | 搜索关键词；去掉首尾空白后不能为空 |
| `picsize` | `picsize` | `pic` | 封面尺寸，数字或数字字符串，如 `300` |
| `br` | `br` | `song` / `url` | 类型上为 `128` / `320` / `380` / `400`；运行时原样发送 |
| `format` | `format` | `lrc` | `lrc`、`trans`、`roma`、`elrc`、`yrc`、`qrc`、`lys`、`spl`、`ttml`、`amjson`、`ass`、`lqe`、`srt`、`txt` |
| `trans` | `trans` | `lrc` | `true` 输出翻译；`'inline'` 追加在原行后 |
| `roma` | `roma` | `lrc` | 是否并入罗马音副轨 |
| `romaFirst` | `roma_first` | `lrc` | 副轨顺序反转为「原文 → 罗马音 → 翻译」 |
| `lrcNormalize` | `lrc_normalize` | `lrc` | 是否统一时间轴；只有显式传入才发送，默认行为由 Meting-API 决定 |
| `handsome` | `handsome` | `song` / `playlist` / `albumlist` | 让接口返回 `cover` 而不是 `pic` |
| `refresh` | `refresh` | 全部 | 构建期跳过缓存读取；浏览器端只透传给接口 |
| `imgRedirect` | `img_redirect` | 返回图片链接的接口 | 直接返回源站图片地址 |
| `stream` | `stream` | `playlist` | 分块输出 JSON |
| `page` / `limit` | `page` / `limit` | `search` | 搜索页码与数量 |
| `auth` | `auth` | `url` / `pic` / `lrc` | 服务端开启 AUTH 时的签名；会进入 URL 与缓存键 |
| `lrctype` | `lrctype` | `lrc` | 旧版歌词类型参数，作为 `format` 的兼容别名 |
| `params` | 对象的每个键 | 全部 | 透传额外查询参数，最后写入，可覆盖上面的同名字段 |

## 边界与常见失败

- 构建期失败：`fetchMusic()`、`request()` 与 `player({ client: false })` 的请求失败都会让构建失败，错误以 `[daybook:meting]` 开头并带请求地址；缓存命中时不发请求。
- 超时：默认 `5000` 毫秒，可用 `mdx.meting.timeout` 或单次 `timeout` 覆盖，错误形如 `[daybook:meting] 请求超时（5000ms）：<url>`。
- 限流：公共 API 有 30 秒限流窗口，超限返回 HTTP 429，错误形如 `[daybook:meting] 触发 Meting-API 限流（HTTP 429）`。
- 响应格式：JSON 类型返回空响应、非 JSON、不是曲目数组、或列表项不是对象，都会中断构建并说明原因。
- 不可用曲目：版权或区域限制可能让 `url` 为空；`fetchMusic()` 保留空字符串，`player()` 直接报错并指出曲名。
- 混合内容：HTTPS 站点不要配置 HTTP 的 `api`；同 host 的 HTTP 媒体地址会被自动升级，不同 host 的不会。
- 浏览器跨域：`@mdx/client` 与浏览器端播放器直连 API，接口必须允许跨域；歌词由浏览器 `fetch` 读取，歌词地址也要允许跨域。没有服务端代理可绕开 CORS。
- `lrcNormalize` 不传时不会发送 `lrc_normalize`，统一时间轴与否取决于 Meting-API 的默认值。
- 不要在 MDX 里循环调用接口；大量页面建议自部署 Meting-API，并保留构建期缓存。

## 文件位置

| 文件 | 职责 |
| --- | --- |
| `src/lib/meting-core.ts` | URL 构造、请求执行、错误与曲目归一化，服务端与浏览器端共用 |
| `src/lib/meting.ts` | 构建期客户端：读取 `siteConfig.mdx.meting`，接入缓存 |
| `src/lib/meting-cache.ts` | 缓存文件读写、TTL、原子写入与警告 |
| `src/lib/meting-browser.ts` | 浏览器客户端与 `createMetingClient()` |
| `src/lib/mdx/index.ts` | `@mdx` 入口：`meting.fetchMusic` / `meting.request` / `meting.player` |
| `src/lib/mdx/client.ts` | `@mdx/client` 入口 |
| `src/scripts/meting-player.ts` | 浏览器端播放器的数据填充 |
| `src/components/content/MusicPlayer.astro`、`src/lib/music-player-html.ts` | 播放器组件与共享 DOM |
| `src/lib/content/paths.ts` | `resolveMetingCacheFile()` 缓存路径 |
| `src/config/schema.ts`、`src/config/defaults.ts`、`src/config/define.ts` | `mdx.meting` 的 schema、默认值与校验 |
| `tests/unit/meting.test.ts`、`tests/unit/meting-cache.test.ts` | 参数映射、归一化、缓存与超时的单元断言 |
| `src/content/post/meting-client.mdx` | 示例文章，构建后路径 `/post/meting-client` |
