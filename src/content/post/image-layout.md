---
title: 图片排版示例：图注与并排
date: 2026-10-31 21:45:00
description: 用同一张封面演示正文图片的几种写法：空行分隔、紧跟文字、连续成行、同一行并排，以及窄屏如何折行。
categories: [文章]
tags: [Markdown, 排版]
keywords: [图片, 图注, 排版]
---

正文里的图片不用加任何标记，`src/lib/markdown-pipeline.ts` 会按写法决定它是独占一块，还是和同一行的图片并排。下面用同一张封面把几种情况都排一遍。

## 一张图

图片独占一行时，会带一圈细边框，图注取自 `alt`：

![封面 · Ending Collection vol.1](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg)

## 图片紧跟在文字后面

图片与文字之间不必空行。只要图片独占一行，它照样会单独成块，不会挤在段落里：

这一句的下一行紧接着图片，中间没有空行
![封面 · 紧跟文字](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg)

## 连续两张

两张图各占一行时，会依次排成两个带图注的图块：

![封面 · 第一张](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg)
![封面 · 第二张](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg)

## 同一行并排

同一行里用空格隔开，两张图并排显示，各自保留边框与图注：

![并排 · 左](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg) ![并排 · 右](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg)

三张并排，窄屏会自动折成两列加一行：

![并排 · 一](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg) ![并排 · 二](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg) ![并排 · 三](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg)

## 不写图注

`alt` 留空时仍然保留图块，只是不显示说明文字：

![](https://k-pan.edgeone.ksable.top/public/astro-daybook/music/darling.jpg)
