---
title: Astro Blog Studio：在浏览器里管理博客
date: 2026-10-20 12:00:00
description: 用 GitHub API 和 PAT，在浏览器里直接管理博客的 Markdown 文章——不装服务端，也不把令牌交给第三方。
pin: true
categories: [文章]
tags: [Astro, 工具, 前端]
keywords: [Astro, GitHub API, 博客, PAT]
---

## 为什么要做

写作工具很多，但大多数要么需要一个服务端，要么把内容托管在别人的数据库里。我想要的东西很简单：内容仍然以 Markdown 的形式留在 GitHub 仓库里，编辑器只是一个临时的面板。

## 它能做什么

- 浏览仓库里的文章与日记；
- 新建、编辑、删除 Markdown 文件；
- 用 GitHub API 提交 commit；
- 在浏览器里预览 Markdown 的渲染结果。

## 技术选型

整个应用是 React + Vite 的纯静态站点。PAT 只保存在内存和 `localStorage` 里，请求直接发往 `api.github.com`，不经过任何中间服务器。

```ts
const response = await fetch('https://api.github.com/repos/owner/repo/contents/path', {
  headers: { Authorization: `Bearer ${token}` },
});
```

## 关键实现：PAT 只存在内存和 localStorage

令牌不进入 URL，也不写进日志。关闭标签页后内存中的副本就消失了；清除站点数据会一并删除 localStorage。

## 阅读时长怎么算

中文按 400 字/分钟估算，代码块和列表不计入，最少显示 1 分钟。这个数字不精确，但足够让读者判断值不值得点开。

## 踩过的坑

GitHub Contents API 更新文件时必须带 `sha`，否则会得到 409。空仓库没有默认分支，第一次写入前要先创建 README。

## 下一步

把图片上传也接进来，再补一个草稿队列。工具本身不复杂，难的是克制——不要把一个编辑器做成 CMS。
