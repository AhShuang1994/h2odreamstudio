# 首页方案原型

2026-07 重做官网时探索过的几个方向，保留下来当参照。**它们不参与构建，也不会被部署** —— 只是设计过程的存档。

| 文件 | 是什么 |
|---|---|
| `index-bold-linear.html` | **最终选定方向的来源**。Linear 式暗底 + hairline + 靛紫 accent，`src/` 里的 token 就是从这里定下来的 |
| `index-bold-linear-en.html` | 同一方向的英文版排版试验 |
| `index-bold-linear-scrub.html` | 试过用 120 帧序列做 hero scrub。**方案已否决** —— 那批帧借自其他项目，且实测参考站 ERA Residence 的 ScrollTrigger pin 数为 0，帧序列本就不是它的手法。见 ADR-0001 |
| `index-bold.html` | 早期粗版 |
| `index-creative.html` | 另一个方向 |
| `index-redesign.html` | 又一个方向，篇幅最长 |

视觉决策的结论见 `docs/adr/0001-linear-surface-era-motion.md` 与 `docs/adr/0007-single-violet-accent.md`。
