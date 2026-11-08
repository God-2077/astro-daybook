# Meting 音乐客户端

`@mdx` 内置一个 [Meting-API](https://github.com/liuran001/meting-api) 客户端，分两种运行位置：

- **构建期**（默认）：在 MDX 里拉取歌曲、歌单、专辑、搜索结果与歌词，再渲染成普通文本或 `MusicPlayer`。请求会经过服务端缓存，适合大多数页面。
- **浏览器端**：`meting.player({ client: true })` 只输出播放器空壳，由浏览器请求 API 后填充；`@mdx/client` 提供通用的浏览器 fetch API。适合大歌单或不想增加构建时请求的页面。

## 配置

在 `src/config/site.ts`（内容模式为 `<内容根>/config/site.ts`）：

```ts
mdx: {
  meting: {
    api: 'https://163.hyc.moe/', // 默认值，推荐自部署
    timeout: 5000, // 毫秒，默认 5000
    cache: {
      enabled: true,
      ttl: {
        playlist: 86_400_000, // 1 天
        search: 86_400_000, // 1 天
        default: 2_592_000_000, // 30 天，其它类型
      },
    },
  },
},
```

- `api`：Meting-API 基础地址，必须是 http(s) URL，不能带 query/hash。
- `timeout`：单次请求超时时间，单位毫秒，必须是正整数。
- `cache.enabled`：服务端构建缓存，默认开启。
- `cache.ttl`：按类型设置缓存时间（毫秒）。`playlist`、`search` 默认 1 天，其它类型默认 30 天；设为 `0` 表示该类型不缓存。
- 所有字段都可以省略，使用上面的默认值。单次调用也可以用第二个参数覆盖 `{ api, timeout }`。

## 导入

```mdx
import { meting } from '@mdx';
```

`@mdx` 同时提供具名导出，二者等价：

```mdx
import { fetchMusic, player, request } from '@mdx';
```

## 获取音乐信息

`meting.fetchMusic()` 会根据 `type` 返回不同的结构：

```mdx
import { meting } from '@mdx';

export const music = await meting.fetchMusic({
  server: 'netease',
  type: 'song',
  id: '1969519579',
});

歌名：{music.name}

歌手：{music.artist}

URL：{music.url}

歌词地址：{music.lrc}

封面：{music.pic}
```

返回的曲目对象：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | 曲名 |
| `artist` | `string` | 艺人；可能为空字符串 |
| `album` | `string` | 专辑 |
| `source` | `string` | 数据源 |
| `url` | `string` | 播放地址；通常是 Meting 的 `type=url` 接口 |
| `pic` | `string` | 封面地址 |
| `cover` | `string` | `pic` 的别名，供 `MusicPlayer` 使用 |
| `lrc` | `string` | 歌词地址；内容是 LRC 文本，不是 JSON |
| `raw` | `object` | 服务端返回的原始字段，如 `album_artist`、`year`、`disc` |

### 返回类型

| `type` | 返回 |
| --- | --- |
| `song` | 单个曲目对象 |
| `playlist` / `albumlist` / `search` | 曲目数组 |
| `name` / `artist` / `album` / `lrc` | 字符串 |
| `url` / `pic` | 重定向目标字符串 |
| `debug` | 原始对象 |

读取歌词时不要用 `res.json()`，歌词接口返回纯文本：

```mdx
export const lyrics = await fetch(music.lrc).then((res) => res.text());

<pre>{lyrics}</pre>
```

也可以直接取文本接口：

```mdx
export const lyrics = await meting.fetchMusic({
  server: 'netease',
  type: 'lrc',
  id: '1969519579',
});
```

## 直接渲染播放器

`meting.player()` 会拉取曲目并返回 `MusicPlayer`，可以直接放在 MDX 表达式里：

```mdx
import { meting } from '@mdx';

{await meting.player({
  server: 'netease',
  type: 'playlist',
  id: '8900628861',
  autoPlayNext: true,
  playlistExpand: true,
})}
```

- 查询参数与 `fetchMusic` 相同，但 `type` 只支持 `song`、`playlist`、`albumlist`、`search`。
- `autoPlayNext`：一首播完后自动播放下一首，默认 `false`。
- `playlistExpand`：默认展开播放列表，默认 `false`。
- 单曲（`type=song`）会渲染成单曲播放器；歌单/专辑/搜索会渲染成曲目列表。
- 组件样式、歌词、进度条与键盘操作与手写 `<MusicPlayer>` 完全一致，见 [`music-player.md`](./music-player.md)。

### 客户端播放器

在同一个对象里加 `client: true`，构建期不再请求 Meting-API：

```mdx
{await meting.player({
  server: 'netease',
  type: 'playlist',
  id: '8900628861',
  client: true,
  autoPlayNext: true,
  playlistExpand: true,
})}
```

- 构建产物只有播放器空壳和 `data-meting-source`；浏览器读取页面上的 `data-meting-api` / `data-meting-timeout`，请求完成后填入曲目。
- 首屏会显示「正在加载音乐…」；失败时显示「音乐加载失败」，详细错误只输出到浏览器控制台。
- 客户端模式没有服务端缓存，每次页面加载都会请求 API；浏览器 HTTP 缓存仍可能生效。
- 无 JavaScript 时只会保留加载空壳。对 SEO 或稳定性要求高的页面建议使用默认构建期模式。

## 浏览器端 fetch API

`@mdx/client` 只能在浏览器运行，适合自定义脚本或 React/Astro 客户端组件：

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
```

- 默认 API 地址与超时来自 `<html data-meting-api data-meting-timeout>`，由站点配置自动输出。
- 也可以显式创建客户端：`createMetingClient({ api, timeout })`。
- 返回结构与构建期 `fetchMusic` 相同；不读写 `.cache/meting-api-data.json`。
- 浏览器里的 `type=url` / `type=pic` 直接返回 Meting 接口地址，不解析 302 的 `Location`。`<audio>` / `<img>` 会自行跟随重定向。

## 服务端缓存

构建期请求默认写入缓存文件：

- 主题模式：`.cache/meting-api-data.json`
- 内容模式：`<内容根>/cache/meting-api-data.json`（默认内容仓库是 `content/cache/meting-api-data.json`）

缓存按完整请求 URL 区分，`refresh` 参数不写入缓存键。TTL 按类型读取 `siteConfig.mdx.meting.cache.ttl`。`refresh: true` 会跳过缓存读取并更新缓存：

```mdx
{await meting.fetchMusic({
  server: 'netease',
  type: 'playlist',
  id: '8900628861',
  refresh: true,
})}
```

- 缓存文件是本地构建产物，不要提交。主题仓库的 `.cache` 已在 `.gitignore` 中；使用独立内容仓库时请把 `cache/` 加入内容仓库的 `.gitignore`。
- 缓存损坏、无写权限或写入失败只输出一次警告，构建继续请求 API。
- `url` / `pic` 按 `default` TTL 缓存 30 天；如果 CDN 地址带时效，使用 `refresh: true` 或删除缓存文件。
- 浏览器客户端不使用这个缓存。

## 覆盖全部接口

`meting.request()` 返回接口的原始结果，不做曲目归一化：

```mdx
// JSON 类型 → 解析后的对象/数组
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

## 参数

`server` 默认 `netease`，也支持 `tencent`、`kugou`。`id` 在除 `search`、`debug` 外的类型中必填；`search` 省略 `id` 时自动填 `0`。

| 参数 | 适用类型 | 说明 |
| --- | --- | --- |
| `server` | 全部 | 数据源：`netease` / `tencent` / `kugou` |
| `type` | 全部 | 接口类型 |
| `id` | 除 `debug` 外 | 单曲、歌单、专辑或封面 ID |
| `keyword` | `search` | 搜索关键词，必填 |
| `picsize` | `pic` | 封面尺寸，纯数字，如 `300` |
| `br` | `song` / `url` | `128` / `320` / `380` / `400` |
| `format` | `lrc` | `lrc`、`trans`、`roma`、`elrc`、`yrc`、`qrc`、`lys`、`spl`、`ttml`、`amjson`、`ass`、`lqe`、`srt`、`txt` |
| `trans` | `lrc` | `true` 输出翻译；`'inline'` 追加在原行后 |
| `roma` | `lrc` | 是否并入罗马音副轨 |
| `romaFirst` | `lrc` | 副轨顺序反转为「原文 → 罗马音 → 翻译」 |
| `lrcNormalize` | `lrc` | 是否统一时间轴，默认 `true` |
| `handsome` | `song` / `playlist` / `albumlist` | 返回 `cover` 而不是 `pic` |
| `refresh` | 全部 | 忽略服务端缓存，60 秒内同资源只允许一次 |
| `imgRedirect` | 返回图片链接的接口 | 直接返回源站图片地址 |
| `stream` | `playlist` | 分块输出 JSON |
| `page` / `limit` | `search` | 搜索页码与数量 |
| `auth` | `url` / `pic` / `lrc` | 服务端开启 AUTH 时的签名 |
| `lrctype` | `lrc` | 旧版歌词类型参数，作为 `format` 的兼容别名 |
| `params` | 全部 | 透传额外查询参数，后写入，可覆盖同名字段 |

## 行为与边界

- **构建期请求**：MDX 里的顶层 `await` 在构建时执行。缓存未命中、离线构建、API 不可达或超时会直接让构建失败（或按缓存策略等待），错误信息带 `[daybook:meting]` 前缀和请求地址。
- **超时**：默认 `5000ms`。构建期由 `siteConfig.mdx.meting.timeout` 控制；浏览器 `client: true` 使用页面上的 `data-meting-timeout`，同样默认 `5000ms`。
- **限流**：公共 API 有 30 秒限流窗口，超限返回 HTTP 429。不要在 MDX 里循环调用；构建大量页面时建议自部署 Meting-API，并依赖服务端缓存。
- **重定向**：`type=url` / `type=pic` 默认返回 302。构建期读取 `Location` 后返回目标地址；浏览器端直接返回接口地址。返回的 CDN 地址可能带时效，需要更新时使用 `refresh: true`。
- **混合内容**：如果 `api` 是 HTTPS，而响应里的 `url` / `pic` / `lrc` 是同一 host 的 HTTP 地址，客户端会自动升级为 HTTPS，避免浏览器拦截。HTTPS 站点不要配置 HTTP 的 Meting API。
- **CORS**：浏览器端直接请求 Meting-API，自定义服务必须返回 `Access-Control-Allow-Origin`；`MusicPlayer` 在浏览器里 `fetch` 歌词地址也要求歌词服务允许跨域。默认公共 API 已允许跨域。
- **不可用曲目**：版权、区域或平台限制可能让 `url` 为空；`meting.player()` 会直接报错并指出曲名，`fetchMusic()` 则保留空字符串。
- **缓存位置**：主题模式 `.cache/meting-api-data.json`，内容模式 `<内容根>/cache/meting-api-data.json`。缓存写入是原子的；损坏或无权限时只警告，不阻断构建。
- **刷新**：`refresh: true` 跳过缓存读取；删除缓存文件或设置 `cache.enabled: false` 可以整体重置。

## 文件

- 共享请求与归一化：`src/lib/meting-core.ts`
- 服务端客户端与缓存接入：`src/lib/meting.ts`
- 服务端缓存：`src/lib/meting-cache.ts`
- 浏览器客户端：`src/lib/meting-browser.ts`
- MDX 入口与 `player()`：`src/lib/mdx/index.ts`（别名 `@mdx`）
- 浏览器入口：`src/lib/mdx/client.ts`（别名 `@mdx/client`）
- 客户端播放器脚本：`src/scripts/meting-player.ts`
- 播放器组件：`src/components/content/MusicPlayer.astro`
- 示例页：`src/content/pages/music.mdx`
