---
title: Markdown 语法测试文件
date: 2026-09-20 09:00:00
description: 标题、列表、引用、代码、表格、脚注与公式——一份用来检查渲染管线的语法测试样本，也顺手记下 A 方向的排版取值。
categories: [文章]
tags: [Markdown, 排版]
keywords: [Markdown, 排版, 测试]
hideFrom: [tag, category]
---

> 本文件用于测试 Markdown 渲染器的各项语法支持情况。

---

![Alice in Cradle](https://k-pan.edgeone.ksable.top/blog/post/note/%E4%BE%BF%E7%AC%BA-Alice-in-Cradle-%E7%88%B1%E4%B8%BD%E4%B8%9D%E7%9A%84%E6%91%87%E7%AF%AE%E6%9B%B2-%E5%8F%8D%E7%BC%96%E8%AF%91%E5%8E%BB%E7%A0%81/1.png)

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

---

*文件结束*

## 排版说明

下表是这篇文章逐条落地的排版取值。字体为本地分片的寒蝉全圆体，正文色为 `--foreground`，强调色只取玫瑰色与灰阶，没有引入额外色相。

<table class="a-md-typo-table">
  <thead>
    <tr><th>项目</th><th>取值</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>正文</td><td>17px / 1.9</td><td>375 宽改 16.5px / 1.85；行宽 34em（约 578px）</td></tr>
    <tr><td>段落</td><td>间距 1.15em</td><td>无首行缩进，段间留白呼吸</td></tr>
    <tr><td>H2</td><td>23px / 700 + ✦</td><td>上 2.4em 下 .8em，hover 出现锚点线稿</td></tr>
    <tr><td>H3 / H4</td><td>18px / 16.5px</td><td>H5 15.5px，H6 14.5px muted</td></tr>
    <tr><td>行内代码</td><td>mono .84em</td><td>muted 底，2px 圆角，不加边框</td></tr>
    <tr><td>列表</td><td>左缩进 1.4em</td><td>条目间距 .45em，标记色 muted</td></tr>
    <tr><td>任务列表</td><td>16px 方框</td><td>手绘 check 用边框画出，不用 emoji</td></tr>
    <tr><td>引用</td><td>1px 左边线</td><td>文字 muted，嵌套引用同样收进 20px</td></tr>
    <tr><td>代码块</td><td>13px mono / 横向滚动</td><td>纸面卡：1px 边框 + muted 底；Shiki github-light / github-dark token</td></tr>
    <tr><td>表格</td><td>15px</td><td>表头 12.5px 加字距，单元格下边线分隔</td></tr>
    <tr><td>图片</td><td>1px 框</td><td>11.5px 说明；原型用 SVG 线稿代替远程占位图</td></tr>
    <tr><td>脚注</td><td>13px</td><td>点线分隔，编号可跳转并回跳</td></tr>
    <tr><td>公式</td><td>Cambria Math 等宽排印</td><td>真实站点由 rehype-katex 输出 KaTeX HTML</td></tr>
    <tr><td>分割线</td><td>1px dashed</td><td>— / *** / ___ 同一渲染结果</td></tr>
    <tr><td>定义列表</td><td>未启用</td><td>当前管线不支持，已在第 10 节注明</td></tr>
    <tr><td>移动 TOC</td><td>箭头 180° 旋转</td><td>默认向下，展开 .16s；reduced-motion 关闭</td></tr>
    <tr><td>摘要</td><td>details 折叠面板</td><td>默认展开，保留左侧 1px 线</td></tr>
    <tr><td>深色图标</td><td>rose</td><td>H2 ✦ / 评论 ✦ / 导航与 TOC chevron 统一</td></tr>
  </tbody>
</table>
