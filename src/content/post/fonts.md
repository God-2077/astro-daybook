---
title: 给博客换一副圆体
date: 2026-09-12 16:20:00
description: 从 koharu 站抄来配色之后，真正让页面变可爱的其实是字形。这篇写字体选型、cn-font-split 分片与首屏不抖的加载顺序。
categories: [文章]
tags: [字体, 设计]
keywords: [字体, 圆体, 网页性能]
hideFrom: [tag, category]
---

## 选字

寒蝉全圆体的笔画像把锋利的地方都磨圆了，放在暖白底上不刺眼。它不适合长文阅读的正文，但做标题、日期和按钮很合适。

## 分片

中文字体动辄几 MB，直接加载会拖慢首屏。用 `cn-font-split` 按 unicode-range 切成一百多片，浏览器只会下载当前页面用到的部分。

```bash
npx cn-font-split -i ChillRoundF.ttf -o public/fonts --css
```

## 加载顺序

先让字体 CSS 和页面 CSS 并行下载，再给 `@font-face` 加 `font-display: swap`。字体没到时用系统字体顶上，到了再替换，避免整页空白。

## 不抖的细节

标题行高和字重固定，不因为字体切换改变布局；日期的等宽数字用 `font-variant-numeric: tabular-nums`。

## 结果

首屏大约多了一百多 KB 的字体请求，但视觉上的变化很明显。值不值得，要看你更在意哪一边。
