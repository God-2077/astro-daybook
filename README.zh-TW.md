# Daybook

一頁可以慢慢讀的日記站——一個基於 Astro 的靜態部落格主題，用 Markdown 寫下每一天，組成一個安靜、素淨、能搜尋的個人部落格。

**線上預覽**：<https://daybook.demo.ksable.top/>

[简体中文](./README.md) · [English](./README.en.md) · [日本語](./README.ja.md) · 繁體中文

---

![桌面端 · 淺色](./docs/images/preview-desktop-light.png)

![桌面端 · 深色](./docs/images/preview-desktop-dark.png)

<img src="./docs/images/preview-mobile.png" width="320" alt="行動版" />

---

## 功能特色

- **以日記為主**：一天一篇，自動按月分組，左側日期欄讓時間軸一目了然
- **文章另存**：需要寫長文時放進文章目錄，內建分類、標籤與關鍵字
- **安靜的設計**：紙白底色、細線分隔、淡粉點綴，沒有卡片、描邊和陰影
- **深色模式**：跟隨系統，也可以手動切換，切換時不閃白
- **全文搜尋**：建置時產生索引，輸入即搜，可按日記、文章、頁面篩選
- **置頂與草稿**：置頂日記單獨成組；草稿只在本地開發時出現
- **長文自動收合**：首頁只露出開頭，想讀完再點「展開全文」
- **正文增強**：側邊目錄、程式碼高亮、數學公式、圖片點開放大、註腳
- **密碼保護**：某一篇只想自己看，加一個密碼即可
- **評論**：隨時接入 Twikoo、Waline 或 Artalk
- **歸檔與熱力圖**：按年月回顧全部內容，寫作熱力圖顯示哪幾天留下了字
- **訂閱與分享**：三路 RSS、sitemap、robots，以及連結卡片預覽圖
- **音樂頁**：把喜歡的歌單放進站內播放
- **多語言**：一次建置輸出簡體中文、繁體中文、English、日本語其中一種介面
- **手機友善**：小螢幕自動收起導覽，底部導覽隨手切換

## 快速開始

需要 Node.js **22.23.4** 以上與 [pnpm](https://pnpm.io/)。

```bash
git clone https://github.com/God-2077/astro-daybook.git
cd astro-daybook
pnpm install
pnpm dev        # 開啟 http://localhost:4321
```

跑起來之後：

1. 開啟 `src/config/site.ts`，把標題、副標題、作者和 `url`（實際網域）改成自己的。
2. 在 `src/content/daily/` 裡新建一個 `.md` 檔案，寫下第一篇日記。
3. `pnpm build` 會產生 `dist/`，把整個目錄上傳到任何靜態託管即可。

託管平台（Vercel、Cloudflare Pages、Netlify 等）可以直接匯入儲存庫：建置指令填 `pnpm build`，輸出目錄填 `dist`。詳細步驟見[部署說明](./docs/configuration.md#部署)。

## Frontmatter 範例

日記放在 `src/content/daily/`，只有 `date` 為必填：

```yaml
---
title: 十一月的第一杯茶
date: 2026-11-01 21:30:00
category: 日常 # 首頁/詳情/歸檔裡的展示標籤
# updated: 2026-11-02 09:00:00
# description: 手寫一段摘要，用於 RSS、搜尋與分享卡片
# slug:                          # 預設由檔案路徑產生
# permalink: notes/first-tea     # 覆寫完整 URL
# draft: true                    # 草稿：只在開發時可見
# pin: true                      # 置頂
# password: paper2024            # 加密：輸入密碼才能讀正文
# hideFrom: [home, rss, archive, search, tag, category, sitemap]
# comments: false
---
```

文章放在 `src/content/post/`，`title` 與 `date` 為必填，另外支援分類與標籤：

```yaml
---
title: 用 Astro 搭一個日記站
date: 2026-10-20 10:00:00
categories: [文章]
tags: [Astro, 前端]
keywords: [靜態部落格]
---
```

欄位全集、可見性矩陣與 URL 規則見 [`docs/content.md`](./docs/content.md)。

## 設定說明

設定都是 TypeScript 檔案，改完重新整理開發伺服器即可生效；欄位寫錯會在建置時直接報錯並指出位置。

| 想改什麼 | 去哪裡 |
| --- | --- |
| 標題、副標題、作者、網域、語言、導覽、分頁、評論、SEO | `src/config/site.ts` |
| 友鏈分組 | `src/config/links.ts` |
| 關於頁正文 | `src/content/spec/about.mdx` |
| 音樂頁歌單 | `src/pages/music.mdx` |

- 全部設定欄位、評論接入、部署與安全邊界：[`docs/configuration.md`](./docs/configuration.md)
- 內容目錄、frontmatter 與可見性：[`docs/content.md`](./docs/content.md)
- 歌單與播放器：[`docs/music-player.md`](./docs/music-player.md)

## 鳴謝

本站正文使用字體 [寒蟬全圓體](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular)。

感謝以下專案在 astro-daybook 開發過程中提供的靈感與參考：

- [astro-koharu](https://github.com/cosZone/astro-koharu)
- [Firefly](https://github.com/CuteLeaf/Firefly)
- [Mizuki](https://github.com/LyraVoid/Mizuki)
- [fuwari](https://github.com/saicaca/fuwari)

## License

[GNU Affero General Public License version 3 (AGPL-3.0)](./LICENSE)

第三方資源：正文圖片放大使用 [lightGallery](https://www.lightgalleryjs.com/)（GPLv3 / 商業雙重授權，授權說明見[文件](./docs/configuration.md#图片放大)），字體為寒蟬全圓體子集（OFL-1.1）。
