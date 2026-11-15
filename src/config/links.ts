import { defineLinksConfig } from './define';

/**
 * 友链页配置：按分组展示朋友与关注的站点。
 *
 * 通过 `defineLinksConfig()` 进入 parse → validate 链路；
 * `groups` 必填（可为空数组），组内 `links` 也允许为空，空分组在页面上会被过滤掉。
 * 字段说明见 `docs/configuration.md`，配置层导读见 `src/config/README.md`。
 */
export const linksConfig = defineLinksConfig({
  /**
   * 友链分组列表（必填）。
   *
   * 每个分组：
   * - `name`：分组名，必填且非空。
   * - `description`：分组说明，可选，默认 `''`；显示在分组标题下方。
   * - `links`：组内友链数组，可为空数组（空数组的分组不会渲染）。
   *
   * 每条友链：
   * - `name`：站点名，必填且非空。
   * - `url`：站点地址，必填；必须是合法的 `http://` 或 `https://` 外链（不能带 query/hash）。
   * - `avatar`：头像，可选；允许 `http(s)://` 绝对地址或以 `/` 开头的站内路径（通常放 `public/` 下）。
   * - `description`：一句话简介，可选，默认 `''`。
   *
   * 注意：外链在页面上以新标签打开；头像缺失时页面会显示占位样式。
   */
  groups: [
    {
      name: '知り合い',
      description: '一緒に文章を書き、道具をいじっている友人たち。',
      links: [
        { name: '紙飛行機', url: 'https://example.com/paper-plane', description: '日記を書いている隣人。' },
        { name: '峠の上', url: 'https://example.com/ridge', description: '写真と長い文章。' },
        { name: '北の窓', url: 'https://example.com/north-window', description: 'フロントエンド、フォントと本。' },
      ],
    },
    {
      name: 'リンク仲間',
      description: '行き来の多い個人ブログ。',
      links: [
        { name: 'かすかな光', url: 'https://example.com/glimmer', description: 'デザインについての小さなメモ。' },
        { name: '海辺', url: 'https://example.com/seaside', description: 'ゆっくりした記録。' },
      ],
    },
    {
      name: '一方的に注目',
      description: '好きだけれど、まだリンクを交換していないサイト。',
      links: [
        { name: 'Astro', url: 'https://astro.build', description: 'このサイトで使っているフレームワーク。' },
        { name: 'MDN', url: 'https://developer.mozilla.org', description: 'ドキュメントを調べる場所。' },
      ],
    },
  ],
});
