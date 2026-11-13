---
title: Markdown 语法
date: 2026-09-20 09:00:00
description: Markdown 基础的语法演示
categories: [文章]
tags: [Markdown, 排版]
keywords: [Markdown, 排版, 测试]
---

> 本文件用于演示 Markdown 基础的语法。

---

## 1. 标题

<!-- 与定稿原型一致：这一组演示标题直接用 HTML 书写，不带 ✦ 与锚点 -->
<h1>H1 一级标题</h1>

<h2>H2 二级标题</h2>

<h3>H3 三级标题</h3>

<h4>H4 四级标题</h4>

<h5>H5 五级标题</h5>

<h6>H6 六级标题</h6>

## 2. 文本格式

普通文本段落。

**粗体文本**、*斜体文本*、***粗斜体文本***、~~删除线~~、`行内代码`。

也可以使用 <u>下划线</u>、<mark>高亮</mark>、H<sub>2</sub>O、x<sup>2</sup> 等 HTML 标签。

转义字符测试:\*不是斜体\*、\# 不是标题、\\ 反斜杠。

换行测试:  
这一行使用了行尾两个空格强制换行。

## 3. 列表

### 无序列表

- 第一项
- 第二项
  - 嵌套项 A
  - 嵌套项 B
    - 更深层级
- 第三项

### 有序列表

1. 第一步
2. 第二步
   1. 子步骤 2.1
   2. 子步骤 2.2
3. 第三步

### 任务列表

- [x] 已完成任务
- [ ] 未完成任务
- [ ] 另一个待办

## 4. 引用

> 一级引用
>
> > 嵌套引用
>
> 引用中的 **粗体** 和 `代码`

## 5. 代码

行内代码:`console.log("hello")`

```ts
// TypeScript 代码块
interface Entry {
  slug: string;
  date: Date;
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
}
```

```python
# Python 代码块
def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fibonacci(10))
```

```
无语言标识的代码块
  保留    缩进与空格
```

## 6. 表格

| 左对齐 | 居中 | 右对齐 |
| :--- | :---: | ---: |
| 内容 A | 内容 B | 内容 C |
| 长一点的单元格 | `code` | **加粗** |
| 1 | 2 | 3 |

## 7. 链接与图片

[普通链接](https://example.com)

[带标题的链接](https://example.com "悬停显示标题")

https://example.com

![示例图片 · 图片标题](/images/demo/diary-line.svg)

图片与文字之间不空行、图片独占一行时，同样按独立图片处理：

这一段紧跟着一张图片
![示例图片 · 紧跟文字](/images/demo/diary-line.svg)

同一行用空格隔开的图片会并排显示（窄屏自动折行）：

![并排图片 · 左](/images/demo/diary-line.svg) ![并排图片 · 右](/images/demo/diary-line.svg)

三张图片并排：

![并排图片 · 一](/images/demo/diary-line.svg) ![并排图片 · 二](/images/demo/diary-line.svg) ![并排图片 · 三](/images/demo/diary-line.svg)

## 8. 分割线

---

***

___

## 9. 脚注

这是一个带脚注的句子[^1],这是另一个脚注[^note]。

[^1]: 这是第一个脚注的内容。
[^note]: 这是命名脚注的内容。

## 10. 定义列表(部分渲染器支持)

<p class="a-md-note">当前管线未启用定义列表插件，以下内容按普通段落渲染——真实站点若需要，应显式加入 remark-definition-list 并在此处补样式。</p>

术语 A

<p class="a-md-dd">: 术语 A 的解释</p>

术语 B

<p class="a-md-dd">: 术语 B 的解释</p>

## 11. 数学公式(部分渲染器支持)

行内公式:$E = mc^2$

块级公式:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## 12. 综合嵌套测试

1. 列表项中包含引用:

   > 引用内容

2. 列表项中包含代码块:

   ```sh
   npm install markdown-it
   ```

3. 列表项中包含表格:

   | 名称 | 值 |
   | --- | --- |
   | a | 1 |
