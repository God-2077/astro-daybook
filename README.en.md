# Daybook

A diary site made for slow reading — a static blog theme built on Astro. Write each day down in Markdown, and build it into a quiet, understated personal blog you can search.

**Live demo**: <https://daybook.demo.ksable.top/>

[简体中文](./README.md) · English · [日本語](./README.ja.md) · [繁體中文](./README.zh-TW.md)

---

<table width="100%" align="center">
  <tr>
    <td colspan="3" align="center">
      <img src="./docs/images/preview-desktop-light.png" alt="Desktop · Light">
      <br>Desktop · Light
    </td>
  </tr>
  <tr>
    <td align="center"><img src="./docs/images/preview-desktop-dark.png" alt="Desktop · Dark"><br>Desktop · Dark</td>
    <td align="center"><img src="./docs/images/preview-mobile-light.png" alt="Mobile · Light"><br>Mobile · Light</td>
    <td align="center"><img src="./docs/images/preview-mobile-dark.png" alt="Mobile · Dark"><br>Mobile · Dark</td>
  </tr>
  <tr>
    <td colspan="3" align="center">
      <img src="./docs/images/lighthouse.png" alt="Lighthouse performance report">
      <br>Lighthouse
    </td>
  </tr>
</table>

---

## Features

- **Diaries first, articles kept apart**: one entry a day, grouped by month; long pieces live in the articles folder with categories, tags and keywords.
- **Quiet paper pages and dark mode**: paper-white background, hairline rules, soft pink accents — no cards and no shadows; dark mode follows the system or switches by hand.
- **Search, archive and heatmap**: the search index is built at build time; look back by year and month, and see which days left words behind on the writing heatmap.
- **Writing extras**: footnotes, math, Mermaid, GitHub alerts, collapsible blocks, timelines, video and repository embeds; copyable code, click-to-zoom images and a table of contents beside the article.
- **Visibility controls**: pin, drafts, password protection, and per-surface hiding (home, RSS, archive, search, tags, categories, sitemap).
- **Comments and feeds**: Twikoo, Waline or Artalk; three RSS feeds, a sitemap, robots and share cards.
- **Multilingual and mobile friendly**: each build outputs one interface language — Simplified Chinese, Traditional Chinese, English or Japanese; navigation folds away on small screens, with a configurable bottom bar.
- **Theme and content in separate repositories (optional)**: clone and pull the content repository independently, so writing commits stay out of the theme history.

## Quick start

Requires Node.js **22.23.4** or newer and [pnpm](https://pnpm.io/) (see `engines` in `package.json`).

```bash
git clone https://github.com/God-2077/astro-daybook.git
cd astro-daybook
pnpm install
pnpm dev        # open http://localhost:4321
```

Once it is running:

1. Open `src/config/site.ts` and change `title`, `url` (your real domain) and `author` to your own.
2. Create a `.md` file in `src/content/daily/` and write your first diary — only `date` is required.
3. Run `pnpm build` to generate `dist/`, then upload that whole folder to any static host.

The smallest diary:

```yaml
---
title: The First Cup of Tea in November
date: 2026-11-14 21:30:00
---
```

See [Quick start](./docs/quick-start.md) for the full install, writing and build walkthrough.

## Content repository (optional)

By default `pnpm dev` and `pnpm build` use the theme's own `src/content/`. To keep writing in its own Git repository, put the content there, point `CONTENT_REPO_URL` in `.env` at it, pull it with `pnpm content:clone`, and build with `pnpm dev:content` / `pnpm build:content`. Official content repository example: <https://github.com/God-2077/astro-daybook-content/>.

See [Theme and content in separate repositories](./docs/dual-repo.md) for the full steps and limits.

## Configuration

| What you want to change | Where to look |
| --- | --- |
| Title, subtitle, author, domain, language, navigation, pagination, comments, SEO | `src/config/site.ts` |
| Friend-link groups | `src/config/links.ts` |
| Body of the About page | `src/content/spec/about.mdx` |
| Playlist on the music page | `src/content/pages/music.mdx` |
| Content repository URL, directory, branch, SSH key | `CONTENT_REPO_*` in `.env` |
| Site config and friend links in content mode | `<content root>/config/site.ts`, `<content root>/config/links.ts` |

See [Configuration](./docs/configuration.md) for every field, its default and how validation failures are reported.

## Documentation

The documentation is written in Simplified Chinese.

| I want to… | Read |
| --- | --- |
| Get it running for the first time | [Quick start](./docs/quick-start.md) |
| Change config, navigation, comments, SEO | [Configuration](./docs/configuration.md) |
| Write diaries and articles, frontmatter, password protection | [Writing guide](./docs/writing.md) |
| Use footnotes, math, Mermaid, collapsible blocks | [Markdown extensions](./docs/markdown.md) |
| Put a playlist on a page | [Music player](./docs/music-player.md) |
| Deploy to a static host | [Deployment](./docs/deployment.md) |
| Auto-publish with Vercel and a content repository | [Deploy to Vercel](./docs/deployment-vercel.md) |
| Split theme and content | [Dual repository](./docs/dual-repo.md) |
| Fix a failed build or missing search | [Troubleshooting](./docs/troubleshooting.md) |
| Every page, including maintainer docs | [Documentation index](./docs/README.md) |

## Faster diary writing (optional)

Tired of launching an IDE, creating files by hand and typing git commands? Try [Astro Blog Studio](https://github.com/God-2077/astro-blog-studio): connect your repository in the browser, write entries in the same directory, preview changes live and commit with one click. It does not change your repository structure or build configuration.

## Credits

Body text on this site is set in [ChillRoundF](https://chinese-font.netlify.app/zh-cn/fonts/hcqyt/ChillRoundFRegular).

Thanks to these projects for the inspiration and reference they gave astro-daybook:

- [astro-koharu](https://github.com/cosZone/astro-koharu)
- [Firefly](https://github.com/CuteLeaf/Firefly)
- [Mizuki](https://github.com/LyraVoid/Mizuki)
- [fuwari](https://github.com/saicaca/fuwari)

## License

[GNU Affero General Public License version 3 (AGPL-3.0)](./LICENSE)

Third-party resources: image zoom in articles uses [lightGallery](https://www.lightgalleryjs.com/) (GPLv3 / commercial dual license; see [“Image zoom” in Configuration](./docs/configuration.md#图片放大)) and the font is a subset of ChillRoundF (OFL-1.1).
