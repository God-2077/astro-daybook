---
title: OpenAI API 客户端踩坑记录
date: 2026-08-24 23:40:00
description: 超时、重试、流式返回与 token 计数：一个能跑但总在半夜挂掉的客户端，被我拆成四层重写了一遍。
categories: [便笺]
tags: [Python, API]
keywords: [OpenAI, Python, 重试]
hideFrom: [rss]
---

## 第一版：能跑

最初的客户端只有一个 `requests.post`。白天一切正常，到了半夜开始出现 `ReadTimeout`，重试逻辑又把并发打满，最后整台机器都在等网络。

## 第二版：加超时和重试

把连接超时和读取超时分开，重试只针对 429 和 5xx，并且带指数退避。这个版本稳定了很多，但流式返回仍然会把连接挂在半开状态。

## 第三版：分层

拆成 transport、retry、stream、usage 四层。transport 只负责发请求；retry 不关心返回内容；stream 处理 SSE 分片；usage 单独累计 token。

## 第四版：可观测

给每次请求加一个 request id，记录耗时、重试次数和 token 用量。出问题时至少能回答「是哪一层慢」。

## 教训

- 不要在没有超时的地方调用网络；
- 重试必须带抖动，否则会把重试风暴精确地打在同一个时间点；
- 流式接口的结束条件是协议事件，不是连接关闭。
