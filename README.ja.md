# Daybook

少しずつ読み進められる日記サイト——Astro 製の静的ブログテーマ。毎日を Markdown で書き留めると、静かで素朴な、検索できる個人ブログになります。

**オンラインプレビュー**：<https://daybook.demo.ksable.top/>

[简体中文](./README.md) · [English](./README.en.md) · 日本語 · [繁體中文](./README.zh-TW.md)

---

<table width="100%" align="center">
  <tr>
    <td colspan="3" align="center">
      <img src="./docs/images/preview-desktop-light.png" alt="デスクトップ · ライト">
      <br>デスクトップ · ライト
    </td>
  </tr>
  <tr>
    <td align="center"><img src="./docs/images/preview-desktop-dark.png" alt="デスクトップ · ダーク"><br>デスクトップ · ダーク</td>
    <td align="center"><img src="./docs/images/preview-mobile-light.png" alt="モバイル · ライト"><br>モバイル · ライト</td>
    <td align="center"><img src="./docs/images/preview-mobile-dark.png" alt="モバイル · ダーク"><br>モバイル · ダーク</td>
  </tr>
  <tr>
    <td colspan="3" align="center">
      <img src="./docs/images/lighthouse.png" alt="Lighthouse パフォーマンスレポート">
      <br>Lighthouse
    </td>
  </tr>
</table>

---

## 機能

- **日記が中心**：1日1ページ、月ごとに自動でグループ化。左側の日付欄で時間の流れがひと目でわかります。
- **記事は別に保存**：長い文章を書きたいときは記事用のディレクトリへ。カテゴリ、タグ、キーワードを備えています。
- **静かなデザイン**：紙のような白を基調に、細い区切り線と淡いピンクを添えて。カードも枠線も影もありません。
- **ダークモード**：システム設定に追従し、手動で切り替えることもできます。切り替え時に画面が白くちらつきません。
- **全文検索**：ビルド時にインデックスを生成。入力と同時に検索でき、日記・記事・ページで絞り込めます。
- **固定と下書き**：固定された日記は別のグループにまとまります。下書きはローカル開発時だけ表示されます。
- **長文は自動で折りたたみ**：ホームでは冒頭だけを表示し、続きは「全文を読む」から読めます。
- **本文の拡張**：サイド目次、コードハイライト、数式、画像のクリック拡大、脚注。
- **パスワード保護**：ある1ページだけを自分用にしたいときは、パスワードを1つ設定するだけです。
- **コメント**：Twikoo、Waline、Artalk をいつでも接続できます。
- **アーカイブとヒートマップ**：年月ごとにすべてのコンテンツを振り返ることができ、執筆ヒートマップでどの日に言葉を残したかがわかります。
- **配信と共有**：3系統の RSS、sitemap、robots、そしてリンクカード用のプレビュー画像。
- **音楽ページ**：お気に入りのプレイリストをサイト内で再生できます。
- **多言語**：1回のビルドで、簡体字中国語・繁体字中国語・English・日本語のいずれかのインターフェースを出力します。
- **スマートフォン対応**：小さい画面ではナビゲーションが自動でまとまり、ボトムナビゲーションですばやく切り替えられます。

## クイックスタート

Node.js **22.23.4** 以上と [pnpm](https://pnpm.io/) が必要です。

```bash
git clone https://github.com/God-2077/astro-daybook.git
cd astro-daybook
pnpm install
pnpm dev        # http://localhost:4321 を開く
```

動かせるようになったら：

1. `src/config/site.ts` を開き、タイトル、サブタイトル、作者、`url`（実際のドメイン）を自分のものに変更します。
2. `src/content/daily/` に `.md` ファイルを新規作成し、最初の日記を書きます。
3. `pnpm build` で `dist/` を生成し、そのディレクトリごと任意の静的ホスティングにアップロードすれば公開できます。

ホスティングサービス（Vercel、Cloudflare Pages、Netlify など）からはリポジトリを直接読み込めます。ビルドコマンドに `pnpm build`、出力ディレクトリに `dist` を指定してください。詳しい手順は[デプロイの説明](./docs/configuration.md#部署)をご覧ください。

## Frontmatter の例

日記は `src/content/daily/` に置きます。必須なのは `date` だけです：

```yaml
---
title: 十一月の最初の一杯のお茶
date: 2026-11-01 21:30:00
category: 日常 # ホーム／詳細／アーカイブで表示されるラベル
# updated: 2026-11-02 09:00:00
# description: 手書きの要約。RSS、検索、共有カードに使われます
# slug:                          # 既定ではファイルパスから生成されます
# permalink: notes/first-tea     # URL 全体を上書きします
# draft: true                    # 下書き：開発時のみ表示
# pin: true                      # 固定
# password: paper2024            # 暗号化：パスワードを入力すると本文が読めます
# hideFrom: [home, rss, archive, search, tag, category, sitemap]
# comments: false
---
```

記事は `src/content/post/` に置きます。`title` と `date` が必須で、さらにカテゴリとタグを指定できます：

```yaml
---
title: Astro で日記サイトを作る
date: 2026-10-20 10:00:00
categories: [記事]
tags: [Astro, フロントエンド]
keywords: [静的ブログ]
---
```

フィールドの一覧、表示可否のマトリクス、URL のルールは [`docs/content.md`](./docs/content.md) をご覧ください。

## 設定ガイド

設定はすべて TypeScript ファイルです。変更して開発サーバーを再読み込みすれば反映されます。フィールドを書き間違えるとビルド時にそのままエラーとなり、該当箇所が示されます。

| 変更したい内容 | 編集するファイル |
| --- | --- |
| タイトル、サブタイトル、作者、ドメイン、言語、ナビゲーション、ページ送り、コメント、SEO | `src/config/site.ts` |
| 友だちリンクのグループ | `src/config/links.ts` |
| このサイトについてページの本文 | `src/content/spec/about.mdx` |
| 音楽ページのプレイリスト | `src/pages/music.mdx` |

- すべての設定項目、コメントの接続、デプロイ、セキュリティの境界：[`docs/configuration.md`](./docs/configuration.md)
- コンテンツのディレクトリ、frontmatter、表示可否：[`docs/content.md`](./docs/content.md)
- プレイリストとプレイヤー：[`docs/music-player.md`](./docs/music-player.md)

## 謝辞

サイトの本文にはフォント [寒蝉全圆体](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular) を使用しています。

astro-daybook の開発にあたり、着想と参考をいただいた以下のプロジェクトに感謝します：

- [astro-koharu](https://github.com/cosZone/astro-koharu)
- [Firefly](https://github.com/CuteLeaf/Firefly)
- [Mizuki](https://github.com/LyraVoid/Mizuki)
- [fuwari](https://github.com/saicaca/fuwari)

## License

[GNU Affero General Public License version 3 (AGPL-3.0)](./LICENSE)

サードパーティのリソース：本文中の画像拡大には [lightGallery](https://www.lightgalleryjs.com/)（GPLv3 / 商用のデュアルライセンス。ライセンスの説明は[ドキュメント](./docs/configuration.md#图片放大)をご覧ください）を、フォントには寒蝉全圆体のサブセット（OFL-1.1）を使用しています。
