# 音乐播放器

`MusicPlayer` 用来在页面里放一组可播放的曲目：封面、曲名与艺人、单行歌词、进度条、上一首 / 播放 / 下一首，以及可收起的播放列表。这页讲各写法的用法、Props、播放行为、资源位置与常见问题；Meting-API 的参数、返回结构与缓存见 [Meting API](./developers/meting-api.md)。

前置：知道内容放在哪、`.mdx` 与 Markdown 正文怎么写（见[写作指引](./writing.md)）。不需要改源码。适用于仓库 `main` 分支当前代码（`package.json` 1.2.1）。

## 适用场景

- 在文章、日记或独立页面里嵌歌单。仓库自带的示例页是 `src/content/pages/music.mdx`（构建后路径 `/music`）。
- 一个页面可以放多个播放器；同一时刻只会播放一个，开始播放时会暂停页面上的其它播放器。

几种入口，底层是同一个播放器：

| 写法 | 数据来源 | 适合 |
| --- | --- | --- |
| `<MusicPlayer playlist={...} />`（MDX） | 构建期写在源码里的 `playlist` 数组 | 固定歌单，字段在构建期校验 |
| `<MusicPlayer metingSource={...} />`（MDX） | 浏览器向 Meting-API 取数 | 曲目由 Meting-API 提供，源码里不写曲目 |
| `meting.player()`（MDX） | 浏览器或构建期向 Meting-API 取数 | 需要 `search`，或要在构建期取数 |
| `:::music`（Markdown 与 MDX） | 容器里的 YAML 列表 | 不想写 JSX，或内容本身是 `.md` |
| `::meting{...}`（Markdown 与 MDX） | 浏览器向 Meting-API 取数 | 用一行指令放一个 Meting 歌单 |

## 用 MusicPlayer 组件

```mdx
import { MusicPlayer } from '@ui';

<MusicPlayer
  playlist={[
    {
      name: '光るなら',
      artist: 'Goose house',
      url: 'https://k-pan.edgeone.ksable.top/public/astro-daybook/music/hikarunara.mp3',
      cover: 'https://k-pan.edgeone.ksable.top/public/astro-daybook/music/hikarunara.jpg',
      lrc: 'https://k-pan.edgeone.ksable.top/public/astro-daybook/music/hikarunara.lrc',
    },
  ]}
  autoPlayNext={true}
  playlistExpand={true}
/>
```

- 在内容里只能在 `.mdx` 中导入组件；`@ui` 是主题的组件出口（`src/components/index.ts` 导出 `Figure` 与 `MusicPlayer`）。仓库自带的示例见 `src/content/pages/music.mdx`。
- `playlist` 在构建期校验：空数组、缺 `name` 或 `url` 都会中断构建，错误信息以 `[daybook:music]` 开头。
- 传 `metingSource` 时不填 `playlist`：构建期不请求接口，曲目由浏览器取回后填入（见「用 Meting 拉歌单」）。

## 用 :::music 写 YAML 歌单

```markdown
:::music
- name: 光るなら
  artist: Goose house
  url: https://k-pan.edgeone.ksable.top/public/astro-daybook/music/hikarunara.mp3
  cover: https://k-pan.edgeone.ksable.top/public/astro-daybook/music/hikarunara.jpg
  lrc: https://k-pan.edgeone.ksable.top/public/astro-daybook/music/hikarunara.lrc
- name: トリカゴ
  artist: XX:me
  url: https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.mp3
:::
```

- 容器里的内容按 YAML 解析，不按 Markdown 渲染；根节点必须是列表，至少一项。
- 字段与 `MusicTrack` 相同（见下文表格）：`name`、`url` 必填，`artist`、`cover`、`lrc` 可选。
- 构建期解析 YAML 并输出与 `MusicPlayer` 相同的 DOM；音频、封面与歌词仍由浏览器按需加载。
- YAML 解析失败、根节点不是列表、缺少结束标记或字段缺失都会中断构建，错误信息以 `[daybook:markdown]` 开头。
- 不要在容器里放 Markdown、MDX 组件或表达式，它们会被当成 YAML 内容。
- `::meting{...}` 是同一个播放器的叶子指令写法，语法见 [Markdown 增强](./markdown.md#音乐播放器)。

## 用 Meting 拉歌单

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

- `meting.player()` 来自 `@mdx`，返回同一个 `MusicPlayer`；`server` 默认 `netease`，`type` 可选 `song`、`playlist`、`albumlist`、`search`。
- `client` 默认为 `true`：构建期只输出播放器空壳，浏览器取数完成后填入曲目；取数期间按钮不可用，标题与曲目数量显示「正在加载音乐…」（下文界面文案以简体中文为例，随构建语言翻译）。
- 浏览器端请求的接口地址与超时来自站点配置 `mdx.meting`（`api` 默认 `https://163.hyc.moe/`，`timeout` 默认 `5000` 毫秒），可以传 `api` / `timeout` 覆盖单次调用。
- `client: false`：在构建期取数并输出可直接播放的曲目；接口失败、没有曲目或曲目缺 `url` 都会中断构建，错误信息以 `[daybook:meting]` 开头。构建期请求会使用服务端缓存。
- 浏览器端没有缓存，要求 Meting-API 允许跨域；失败时卡片标题变为「音乐加载失败」，控制台输出一条 `[daybook:meting]` 警告，按钮保持不可用。
- `::meting` 只支持 `song`、`playlist`、`albumlist`，并且始终是浏览器端空壳；需要 `search` 或构建期取数时用 `meting.player()`。
- `meting.player()` 在构建期校验查询参数：`search` 需要 `keyword`，其它类型需要 `id`，缺失时直接报 `[daybook:meting]` 错误。
- 参数、返回结构与缓存见 [Meting API](./developers/meting-api.md)，缓存细节见[服务端缓存](./developers/meting-api.md#服务端缓存)。

## Props 与 MusicTrack

`MusicPlayer` 的 Props：

| 名称 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `playlist` | `MusicTrack[]` | 与 `metingSource` 二选一 | — | 曲目列表，至少一首；手动使用组件时必填 |
| `metingSource` | `MetingClientSource` | 与 `playlist` 二选一 | — | 浏览器端 Meting 数据源；设置后构建期不请求接口 |
| `autoPlayNext` | `boolean` | 否 | `false` | 当前曲目播完是否自动播下一首（最后一首除外） |
| `playlistExpand` | `boolean` | 否 | `false` | 是否默认展开播放列表 |

- `playlist` 与 `metingSource` 至少要给一个；都不给时构建失败，错误信息为 `[daybook:music] playlist is empty`。

`MusicTrack` 的字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | 曲名；构建期去掉首尾空白，空字符串视为缺失 |
| `url` | `string` | 是 | 音频地址；站内路径或完整的 `https://` 地址 |
| `artist` | `string` | 否 | 艺人；缺省显示「未知艺人」（随构建语言翻译） |
| `cover` | `string` | 否 | 封面图；缺省或加载失败时显示音符线稿 |
| `lrc` | `string` | 否 | LRC 歌词地址；缺省时不显示歌词行 |

- 可选字段为空字符串或只有空白时按未填写处理。

`metingSource` 的字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | `MetingQuery` | 是 | Meting 查询参数（`server`、`type`、`id` 等），见 [Meting API](./developers/meting-api.md) |
| `api` | `string` | 否 | 覆盖站点配置的 Meting-API 地址 |
| `timeout` | `number` | 否 | 覆盖站点配置的请求超时，单位毫秒 |

## 播放与交互行为

- 播放 / 暂停：点中间的大按钮；切换曲目或点其它曲目时会自动开始播放。
- 上一首：当前曲目播放超过 3 秒时先回到本曲开头，否则切到上一首；第一首的上一首是最后一首。
- 下一首：切到下一首，最后一首的下一首回到第一首。
- 进度条：点击跳转；键盘聚焦时 `←` / `→` 各移动 5 秒，`Home` 跳到开头，`End` 跳到结尾。进度条使用 `role="slider"`，读屏器能读到当前时间与总时长。
- 曲目列表：点当前曲目切换播放 / 暂停，点其它曲目切换并开始播放；当前曲目左侧显示 3 根跳动竖条，列表收起时动画暂停，`prefers-reduced-motion: reduce` 下关闭动画。
- 播放列表：默认收起，展开与收起用 `grid-template-rows` 过渡；收起时面板带 `inert`，键盘焦点不会留在隐藏内容里。
- 歌词：只显示一行，切换时向上滚动（240 毫秒）；`prefers-reduced-motion: reduce` 下直接替换。LRC 读取失败、没有时间标签或没有 `lrc` 时不显示歌词。
- 单曲：`playlist` 只有一首时隐藏播放列表区，卡片底部内边距自动补齐；上一首 / 下一首保留。
- 曲目时长：列表里的时长在展开列表或播放曲目时才探测，未探测到显示 `--:--`；播放中按 `MM:SS` 显示。
- 封面加载失败时换成音符线稿；音频加载失败时卡片内显示「音频加载失败」，播放状态回到暂停。
- 自动播放被浏览器拒绝时保持暂停，点一次播放按钮即可。

## 资源放哪里与版权

- `url`、`cover`、`lrc` 可以是站内路径（以 `/` 开头）或完整的 `https://` 地址。
- 站内音频、封面与歌词放当前模式的 public 目录：主题模式是 `public/`，内容模式是 `<内容根>/public/`；构建时原样复制到 `dist/`。内容模式见[双仓库](./dual-repo.md)。
- 歌词通过 `fetch` 读取：跨域时对方必须返回允许跨域的响应头，否则歌词不显示；音频与封面由 `<audio>`、`<img>` 直接加载，不需要跨域头，但要保证地址可达。
- 仓库自带的示例歌单使用外部 CDN（`https://k-pan.edgeone.ksable.top/public/astro-daybook/music/`），仓库里不含音频、封面与歌词文件。
- 曲目版权归各自权利人；正式使用时换成自己的文件并确认授权。

## 排错

| 现象或报错 | 原因 | 解决 |
| --- | --- | --- |
| 构建失败：`[daybook:music] playlist must contain at least one track` | `playlist` 是空数组 | 至少放一首；或改用 `metingSource` |
| 构建失败：`[daybook:music] playlist is empty` | `playlist` 与 `metingSource` 都没给 | 至少给一个 |
| 构建失败：`[daybook:music] playlist[0].url is required` | 某首曲目缺 `name` 或 `url` | 补齐字段；在 `:::music` 里报同一条说明时，外层前缀是 `[daybook:markdown]` |
| 构建失败：`[daybook:markdown] :::music 的 YAML 解析失败：...` | 容器里不是合法 YAML | 修缩进与冒号，根节点用 `-` 列表 |
| 构建失败：`[daybook:markdown] :::music 必须包含 YAML 列表。` | 容器里放了 Markdown 或其他结构 | 改成 YAML 列表，字段名与 `MusicTrack` 一致 |
| 卡片显示「音乐加载失败」，控制台有 `[daybook:meting]` 警告 | 浏览器端取数失败：接口不可达、跨域被拒、参数错误或触发限流 | 检查站点配置 `mdx.meting.api`、接口的跨域设置与查询参数；浏览器端没有缓存，刷新会重试 |
| 卡片一直显示「正在加载音乐…」，按钮不可用 | 请求还没返回或已超时 | 确认接口地址从访客浏览器可访问；超时由 `mdx.meting.timeout` 控制 |
| 曲目时长一直 `--:--` | 还没展开列表或播放该曲目；音频地址不可达 | 展开播放列表或播放一次；检查音频地址 |
| 歌词不显示 | 没填 `lrc`、跨域缺允许跨域的响应头，或文件里没有 `[mm:ss]` 时间标签 | 补齐 `lrc` 与响应头，使用标准 LRC 格式 |
| 封面显示音符线稿 | `cover` 为空或图片加载失败 | 检查封面地址 |
| 切歌后没有开始播放 | 浏览器拒绝了自动播放 | 点一次播放按钮 |
| 想用 `::meting` 放搜索结果或构建期取数 | `::meting` 只支持 `song`、`playlist`、`albumlist`，且始终是浏览器端空壳 | 改用 `meting.player()`（见「用 Meting 拉歌单」） |

相关页面：[Markdown 增强](./markdown.md)、[写作指引](./writing.md)、[Meting API](./developers/meting-api.md)、[双仓库](./dual-repo.md)、[文档索引](./README.md)。
