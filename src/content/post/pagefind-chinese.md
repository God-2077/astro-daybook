---
title: 用 Pagefind 给中文博客做搜索
date: 2026-09-30 10:00:00
description: Pagefind 的默认分词对付不了中文，这篇记我如何改索引参数、用 data-pagefind-body 圈定正文，并接受它慢半拍。
categories: [文章]
tags: [搜索, 前端]
keywords: [Pagefind, 搜索, 中文]
---

## 为什么是 Pagefind

静态站点没有服务端，搜索要么在构建时预生成索引，要么依赖第三方。Pagefind 属于前者：构建完成后扫描 `dist`，把索引切成小块，浏览器只在需要时下载对应的分片。

## 圈定正文

只要站点里有一个页面带 `data-pagefind-body`，其他没有这个属性的页面就不会被索引。因此列表、归档和 404 页面都不加，只给真正需要被搜索的详情页加。

```html
<article data-pagefind-body>
  <h1 data-pagefind-meta="title">文章标题</h1>
  <time data-pagefind-meta="date">2026-09-30</time>
  <div>正文……</div>
</article>
```

## 元数据与筛选

`data-pagefind-meta` 可以输出标题、日期、类型、标签和分类；`data-pagefind-filter` 则让前端按分类、标签筛选。

## 中文分词

Pagefind 自带的分词对中文是按字切分的，召回率尚可，精确度一般。我没有做额外的预先分词——那会引入一套需要持续维护的词典，收益不值得。

## 构建顺序

`astro build` 之后再跑 `pagefind --site dist`。这一步放在 `postbuild` 里，部署时就不会忘。

## 接受的取舍

搜索结果没有实时高亮那么快，输入到出结果大约两百毫秒。对个人博客来说，这个延迟可以接受。
