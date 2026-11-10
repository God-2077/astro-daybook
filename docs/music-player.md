# 音乐播放器

`MusicPlayer` 可以在任意 MDX（文章、日记、独立页面）里导入，用来放一组可播放的曲目。样式沿用纸页日记的令牌与字号，卡片、圆角、阴影与列表高度过渡是这一组件的主题例外。

## 用法

```mdx
import { MusicPlayer } from '@ui';

<MusicPlayer
  playlist={[
    {
      name: '光るなら',
      artist: 'Goose house',
      url: '/music/hikarunara.mp3',
      cover: '/music/hikarunara.jpg',
      lrc: '/music/hikarunara.lrc',
    },
  ]}
  autoPlayNext={true}
  playlistExpand={true}
/>
```

`src/content/pages/music.mdx` 是现成的示例页：音频、封面与歌词都托管在外部 CDN（`https://k-pan.edgeone.ksable.top/public/astro-daybook/music/`），仓库里不含任何音频、封面或歌词文件。`url` / `cover` / `lrc` 既可以是站内路径（如 `/music/xxx.mp3`），也可以是完整的 `https://` 地址。

也可以不手写 `playlist`，直接用 `@mdx` 的 Meting 客户端拉取歌单并渲染同一个组件：

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

`client` 默认为 `true`：构建产物只有播放器空壳，浏览器请求完成后自动填入曲目；显式传 `client: false` 时改在构建期取数，并由 Meting 缓存加速。接口覆盖、缓存与配置见 [`meting.md`](./meting.md)。

Markdown 里也可以不写 MDX：用 `:::music` 容器直接写 YAML 歌单，或用 `::meting{...}` 叶子指令生成同样的播放器。语法与字段限制见 [`markdown.md`](./markdown.md#音乐播放器)。

## Props

| 名称 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `playlist` | `MusicTrack[]` | 手动使用时是 | — | 曲目列表，至少一首；`name` 和 `url` 必填，缺失会在构建期报错。`meting.player()` 会自行传入数据源。 |
| `autoPlayNext` | `boolean` | 否 | `false` | 一首播完后是否自动播放下一首；最后一首播完停止并回到开头。 |
| `playlistExpand` | `boolean` | 否 | `false` | 是否默认展开播放列表。 |

### MusicTrack

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | 曲名。 |
| `url` | `string` | 是 | 音频地址；站内文件写 `/music/xxx.mp3`，外部资源写完整的 `https://…` 地址。 |
| `artist` | `string` | 否 | 艺人；缺省显示「未知艺人」。 |
| `cover` | `string` | 否 | 封面图；站内路径或绝对地址均可，缺省或加载失败时显示音符线稿。 |
| `lrc` | `string` | 否 | LRC 歌词；用 `fetch` 读取，跨域引用时对方必须返回 `Access-Control-Allow-Origin`，否则歌词会静默不显示。缺省不显示歌词行。 |

## 行为

- 支持播放/暂停、上一首/下一首、点击进度条 seek，以及进度条上的 `←` / `→`（±5 秒）、`Home` / `End`。
- 当前曲目左侧显示 3 根跳动竖条；播放列表收起时动画暂停，`prefers-reduced-motion: reduce` 下完全关闭。
- 歌词只显示一行，切换时上下滚动；减少动效时直接替换。
- 单曲（`playlist` 只有一首）时播放列表区（标题栏与曲目面板）不显示，卡片底部内边距自动补齐；上一首/下一首保留。
- 同一页面有多个播放器时，播放其中一个会暂停其余播放器。
- 播放列表展开/收起用 `grid-template-rows: 0fr → 1fr` 过渡；收起时面板带 `inert`，不会把键盘焦点留在隐藏内容里。
- 慢网络下时长先显示 `--:--`，元数据到达后补齐；曲目时长按需探测。

## 文件与初始化

- 组件：`src/components/content/MusicPlayer.astro`，由 `src/components/index.ts` 以 `@ui` 导出。
- 数据：`src/lib/music.ts`（构建期校验、LRC 解析、时间格式化）。
- 交互：`src/scripts/music-player.ts`；`src/scripts/client.ts` 在页面出现 `[data-music]` 时动态载入，ClientRouter 换页后通过 `astro:page-load` 重新初始化。
- 样式：`src/styles/daybook.css` 文件末尾的「音乐播放器」段；图标在 `src/assets/sprite.html` 的 `i-play` / `i-pause` / `i-prev` / `i-next` / `i-music`。
- 文案：`src/i18n/locales/*.ts` 的 `music.*` keys，四个语言文件需同时维护。

## 备注

- 组件在构建期校验 `playlist`，不要在数组里放动态运行时才生成的对象。
- 音频文件放当前模式的 public 目录（主题模式 `public/`，内容模式 `<内容根>/public/`），构建后原样发布；不要放进 `src/assets`，否则会被当作构建资源处理。放外部 CDN 时直接写绝对地址即可。
- 当前示例的音频、封面与歌词托管在外部存储、仅用于演示，仓库不再分发这些文件；正式使用时替换成自己的文件并确认授权。
