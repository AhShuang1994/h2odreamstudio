---
name: screenshot-to-web
description: 把参考图 / 竞品截图复刻成可跑的网页 —— 从图里抽出 design token 写成 DESIGN.md,先出静态 HTML 给用户确认,再转成 React + Tailwind 版本,全程用 Playwright 截图与原图并排对比迭代。两种模式:CLONE(1:1 像素级照抄)与 REMIX(只留 layout 与组件骨架、换品牌与文案)。触发:丢来一张网页截图 / 参考图、"照着这个做一个"、"复刻这个页面"、"这个站我要一样的"、"按这张图做落地页"、"换成 XX 品牌"、"只要它的结构"。
---

> ⚠️ **这是拷贝,不是源头。** 源头在 `AhShuang1994/my-claude-skills` 的
> `skills/design/screenshot-to-web/`。这份存在的理由:云端 session 只克隆本 repo,
> 读不到本机 `~/.claude/skills/`,所以网页版要用就得有一份在库里。
>
> **改这个技能时两边一起改**,只改一边会让同名技能在本机和云端行为不一致 ——
> 那种问题极难查。同步方式见 `.agents/skills/screenshot-to-web/SYNC.md`。

> 📌 **动手前先读同目录的 `LESSONS.md`** —— 过去在这个技能上踩过的坑与改正方式。
> 路径:`%USERPROFILE%\.claude\skills\screenshot-to-web\LESSONS.md`(Windows)
> / `~/.claude/skills/screenshot-to-web/LESSONS.md`(macOS / Linux)
>
> 不要写死 `C:/Users/<某个名字>/` —— 换机器或改用户名之后那种路径会静默失效。

# Screenshot to Web

把一张图变成网页。**不是"看着像就行",是有中间产物、有客观校验、可重复的流水线。**

## 边界

- 做**静态展示页**:落地页、产品页、活动页、单个 section。
- 不做:带后端的应用、表单提交逻辑、CMS 接入、多页路由。用户要这些 → 说明边界,他明确要求后再退出本流程处理。
- 有 scroll-driven / parallax 需求 → 那是 `parallax-*` 五件套的活,不在这里做。

---

## Step 0 — 声明模式,然后才动手

**第一件事是输出一行 Mode Read**,格式:

```
Mode: <CLONE|REMIX> · 输入 = <整页长图|N 个 section 截图|桌面+手机两版> · 输出 → _replicas/<slug>/
```

判定规则:

| 用户说了什么 | 模式 |
|---|---|
| 默认,没有特别说明 | **CLONE** —— 1:1 照抄,连文案和颜色都不改 |
| 「换成 XX 品牌」「改成我们的」 | **REMIX** |
| 「只要结构 / 骨架 / 布局」 | **REMIX** |
| 「换皮 / 套用 / remix」 | **REMIX** |

**REMIX 模式额外读 `anti-ai-rules.md`**(`%USERPROFILE%\.claude\skill-shared\anti-ai-rules.md` / `~/.claude/skill-shared/anti-ai-rules.md`) —— 那是审美最高准则,换配色换文案属于自由创作,要过它的禁令。CLONE 模式**不读**,因为照抄原图时那些禁令会和"忠于原图"打架。

判错了用户一句话就能拨回来 —— 所以必须先声明再动手,不要闷头开始。

## 工具脚本的路径

本技能的所有图像操作都走 `scripts/img.mjs`。**先把路径存成变量再用**,下面所有示例里的 `$IMG` 都指它:

```bash
# Windows (PowerShell)
$IMG = "$env:USERPROFILE\.claude\skills\screenshot-to-web\scripts\img.mjs"

# macOS / Linux
IMG="$HOME/.claude/skills/screenshot-to-web/scripts/img.mjs"
```

四个子命令:

```
img.mjs shot    <file-or-url> <out.png>    [--w 1440] [--h 900] [--full]
img.mjs crop    <in.png>      <out.png>    --y 0 --h 900 [--x 0] [--w <宽>]
img.mjs compare <a.png> <b.png> <out.png>  [--labels "原图,我的"] [--w 2400]
img.mjs webp    <in.png>      <out.webp>   [--width 1440] [--quality 82]
```

只依赖 Playwright(连转 WebP 都是 Chromium 的 canvas 编的),没有 sharp / PIL 的事。
报「找不到 Playwright」就按它给的提示装,不要改脚本绕过去。

## 输出位置

一律落在**当前项目**的 `_replicas/<slug>/`:

```
_replicas/<slug>/
├── _src/            原图、切好的分段图、_inbox/(用户丢回来的生成图)
├── _review/         每轮对比图 + notes.md
├── DESIGN.md        设计 token 规格(阶段②产出)
├── v1-static.html   静态稿(阶段③产出,用户确认它)
├── index.html       React 版(阶段⑤产出)
├── app.jsx
└── components.jsx
```

**开工前先确保 `_replicas/` 在 `.gitignore` 里**,不在就加一行。复刻件默认不进 git、不上线 —— 见文末「上线防护」。

---

## 五个阶段

### ① 读图

长图**先切段再读**。整页长图缩到对话里,12px 和 16px 的字看起来一样,间距全是猜的。

```bash
node "$IMG" crop <原图> _src/sec-1.png --y 0 --h 900
```

按 section 边界切,每段单独读。只给了一两个 section 的截图就不用切。

### ② 抽 token → DESIGN.md

**详见 `references/EXTRACT.md`。** 核心纪律:逐项落成文字再写代码,不许「看一眼就开始写」。

产出 `DESIGN.md`,YAML frontmatter 放 colors / typography / spacing / rounded / components,正文写 Overview / Layout / Assumptions。格式照 `h2odreamstudio/demos/wedding-basic-1-DESIGN.md`。

### ③ 静态稿

**详见 `references/BUILD.md` 前半。** 单文件 HTML,`:root` CSS 变量直接来自 DESIGN.md 的 token。

**这一稿不做动效、不拆组件、图片先用占位。** 它存在的唯一目的是让用户一眼判断"像不像",越快出越好。

### ④ 校验循环 —— 三段式,不许盲目开改

**详见 `references/VERIFY.md`。** 每轮固定三步,顺序不能变:

1. **写差异** —— 按 7 项清单逐条过,每项写「原图是什么 / 我的是什么」。不许笼统说"挺像的"
2. **写计划** —— 列出打算改什么、为什么、预期效果,并给每项定性:
   - **小问题**(尺寸 / 颜色 / 间距 / 圆角这类局部修正)→ 直接执行
   - **结构性问题**(整块 section 看错、栅格判断错、要推翻重写)→ **停下来问用户**
3. **才动手** —— 改完截图进下一轮

每轮的差异和计划**完整打印给用户看**,同时记进 `_review/notes.md`。最多 3 轮,还有差距就停下来把剩余差异列给用户,不要无限迭代。

> ⛔ **阶段④ 结束必须停下等用户确认,不许自己冲进阶段⑤。**
> 用户确认的是静态稿像不像 —— 没确认就拆组件、接图、加动效,一旦方向错了全部白做。

### ⑤ 定稿:配图 + React + Tailwind

用户确认后才做,三件事:

1. **配图** —— 见 `references/IMAGES.md`。三条路线运行时探测,**必须告诉用户走了哪条**
2. **拆 React 组件 + Tailwind** —— 见 `references/BUILD.md` 后半
3. **加动效** —— 默认克制(scroll reveal + hover),除非原图明显有更强的动效语言

转完**再跑一次阶段④**,确认 React 版没跑偏。

---

## 交付时必须一起给的三样

1. **成品路径**,以及怎么看(双击 `index.html`)
2. **走了哪条配图路线**,以及还有哪些图要换(`IMAGES-TODO.md` 的清单)
3. **`DESIGN.md` 里 `## Assumptions` 段的内容** —— 哪些是图上量的、哪些是我推的。用户拿一个推断的数字当依据,和拿一个量出来的,风险完全不同

---

## 上线防护

复刻件默认在 `_replicas/` 且 gitignore,不会上线。

**要把复刻件搬进公开目录(比如 `h2odreamstudio/demos/`)必须同时做三件事:**

1. 加 `<meta name="robots" content="noindex,follow">`
2. 加左下角「概念示范作品 · Concept Demo」徽章(照抄 `h2odreamstudio/demos/landing-fnb-1/landing-fnb-1.html` 末尾那段)
3. 把品牌名、logo、文案换成原创或客户自己的

1:1 照抄别人的品牌资产发到公开域名上会有麻烦。这条不能省,和 `parallax-teardown` 的合规立场一致:**研究和内部参考可以,复制发布不行。**

---

## 升级到 Vite(默认不做)

用户说「这个要上线了」才做:

1. `npm create vite@latest <slug> -- --template react`
2. 装真 Tailwind:`npm i -D tailwindcss @tailwindcss/postcss postcss`,把内联的 `tailwind.config` 落成文件
3. `components.jsx` / `app.jsx` 拆进 `src/components/`,补 `import`/`export`(CDN 版靠全局作用域,没有模块语法)
4. CDN 的 `<script>` 换成 npm 依赖,删掉 babel-standalone
5. `npm run build`,拿 `dist/` 上线

**为什么默认不做**:CDN 版双击就能跑、发给客户就能看,而绝大多数复刻件停在确认阶段就结束了。Vite 的 `npm install` 成本只在真要上线时才值得付。
