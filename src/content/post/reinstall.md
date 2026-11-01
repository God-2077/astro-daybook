---
title: 深夜重装系统：一次安静的迁移
date: 2026-08-05 02:30:00
description: 备份、分区、恢复，把一台用了四年的机器清空重来。这篇只记顺序和几个容易忘的路径。
categories: [文章]
tags: [工具, 前端]
keywords: [重装系统, 备份, Linux]
hideFrom: [search, sitemap]
---

## 备份

先列清单：代码、浏览器配置、SSH 密钥、字体、截图、下载目录里的安装包。代码走 Git，其余打包到移动硬盘。

```bash
tar --exclude='.cache' --exclude='node_modules' -czf backup.tar.gz ~/projects ~/.config
```

## 分区

这次只分三个区：EFI、根分区、家目录。家目录单独放，重装时可以直接保留。

## 安装

用 U 盘启动，关掉 Secure Boot，按原来的分区表挂载。安装器只格式化根分区，家目录保持不动。

## 恢复

先装基础工具和字体，再恢复配置，最后才跑 `pnpm install`。顺序反了会在一堆缓存里迷路。

## 容易忘的路径

- `~/.config/git/config`
- `~/.ssh/`
- 浏览器的 `Local Storage` 与扩展配置
- 输入法的用户词库

## 结果

四个小时后，桌面回来了。没有变得更快，但打开每个文件都知道它为什么在这里。
