# EXTRACT —— 从图里读出 design token

**这一环决定复刻准不准。** 跳过它直接写代码,后面三轮校验都在补它欠的债。

## 铁律:逐项落成文字,再写一行代码

不许「看一眼就开始写」。下面每一项都要有明确答案,写进 `DESIGN.md`,才能进阶段③。

## 置信度标注(借鉴 parallax-teardown)

每一项标一个来源,**不要把推断写成事实**:

| 标记 | 含义 |
|---|---|
| `measured` | 图上直接量出来 / 取样出来的 |
| `inferred` | 推的(图上看不到,按常规推导) |

用户拿一个 `inferred` 的数字当设计依据,和拿 `measured` 的,风险完全不同。分不清就等于给了假数据。

---

## 1. 颜色 —— 取样,不猜

**不许写"大概是深蓝色"。** 逐个取样,写成 hex。至少分这六类:

| 角色 | 说明 |
|---|---|
| `background` | 页面底色 |
| `surface` | 卡片 / 面板的面色(常和 background 差一点点,别合并) |
| `text-primary` | 正文主色 |
| `text-secondary` | 次要文字 / 说明文字 |
| `border` | 描边、分隔线(常是低透明度黑或白,写成 rgba) |
| `accent` | 强调色 —— 按钮、链接、高亮 |

有渐变就把**起止色和方向**都记下来,别只记一个中间色。

**常见错误:把带透明度的边框写成实色。** `rgba(0,0,0,0.06)` 压在不同底色上是不同的观感,写死成 `#F0F0F0` 在深色区就穿帮。

## 2. 字体 —— 只能判字族,不能判确切字体

截图**无法**还原确切字体。只判字族类型,再选最接近的 Google Font:

| 观察到 | 字族 | 常用 Google Font |
|---|---|---|
| 圆润、字母开口大、几何感强 | 几何无衬线 | Poppins, Nunito, Outfit |
| 中性、开口小、偏工业 | Grotesk | Inter, Manrope, Work Sans |
| 有衬线、对比强 | 衬线 | Playfair Display, Fraunces |
| 有衬线、对比弱、偏书本 | 老式衬线 | Lora, Source Serif |
| 超粗 / 超窄 / 装饰性 | 展示体 | Bricolage Grotesque, Archivo |

**在 DESIGN.md 里列 2–3 个备选**,并标 `inferred`,让用户一句话就能换掉。

## 3. 字号 —— 用参照物反推

不要凭空估。找一个已知量做锚:

1. **正文几乎总是 14–18px**,先钉死它
2. 用正文的字高做尺子,量其他文字是它的几倍
3. 反推出整个 scale,归到常规刻度上(12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 48 / 64…)

**h1 与正文的比例是最容易错、也最影响观感的一项**,单独核一遍。

## 4. 间距 —— 先定基准单位,再归刻度

**逐个估间距必错。** 正确做法:

1. 先判基准单位是 **4px 还是 8px**(看最小的那些间隙)
2. 所有 padding / gap / margin 都归到这个刻度的整数倍
3. 归不上去的那几个,才是真的特殊值

section 之间的垂直间距单独记 —— 它决定整页的呼吸感,比任何单个组件都重要。

## 5. 圆角 / 阴影 / 边框

- **圆角**:通常只有 2–3 档(小件、卡片、药丸形)。数清楚有几档,别每个元素单独定
- **阴影**:记「有多散、多深、什么方向」。多数设计只有 2–3 档
- **边框**:记粗细和颜色。1px 的浅边和无边差别很大

## 6. 组件 —— 命名并数清楚

列一张表:按钮有几种(主 / 次 / 幽灵 / 图标)、卡片有几种、输入框、标签、导航项……

**同一类组件的所有实例应该共用一套值。** 图上看起来差一点点,多半是压缩噪点或阴影错觉,不是真的两套。

## 7. Assumptions —— 图上看不到的东西

图是静态的,这些一定看不到,**全部标 `inferred` 并写进 DESIGN.md 的 `## Assumptions`**:

- hover / focus / active 态
- 手机版布局(只给了桌面图时)
- 折叠区、下拉、弹窗
- 动效
- 图片的原始素材(只能看到被裁切后的样子)

**交付时要主动把这段念给用户听**,不要埋在文件里等他自己发现。

---

## DESIGN.md 模板

```markdown
---
version: "alpha"
name: "<页面名>"
description: "<一句话说这是什么页面>"
source: "<原图文件名>"
mode: "CLONE"          # 或 REMIX
colors:
  background: "#FDFCFB"
  surface: "#FFFFFF"
  text-primary: "#2D2D2D"
  text-secondary: "#6B6B6B"
  border: "rgba(0,0,0,0.06)"
  accent: "#E8919A"
typography:
  display-lg:
    fontFamily: "Playfair Display"     # inferred, 备选: Fraunces / Lora
    fontSize: "48px"
    fontWeight: 600
    lineHeight: "56px"
    letterSpacing: "-0.02em"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "26px"
rounded:
  sm: "10px"
  md: "16px"
  full: "9999px"
spacing:
  base: "8px"
  scale: ["8px", "16px", "24px", "32px", "48px", "64px", "96px"]
  section-padding: "96px"
  card-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "14px 28px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.card-padding}"
    shadow: "0 4px 16px rgba(0,0,0,0.06)"
---

## Overview

<整体气质一句话。用具体的词,不要"现代简约"这种放到哪都对的形容。>

## Layout

- 内容最大宽度: 1200px `measured`
- 栅格: 12 列 / 3 列卡片区 `measured`
- section 垂直节奏: 96px `measured`

## Sections

1. <从上到下逐个列出,写清每块是什么、几列、有没有图>

## Assumptions

**以下都是推的,图上看不到:**

- hover 态: 按钮加深 8%,卡片上浮 2px `inferred`
- 手机版: 单列堆叠,断点 768px `inferred`
- 字体: 显示体判为 Playfair Display,备选 Fraunces / Lora `inferred`
```
