# 中文自托管思源黑体／思源宋体子集，排除 MiSans 与 HarmonyOS Sans

`layout.tsx` 只加载了 `Inter({ subsets: ["latin"] })`，中文全部落到系统 fallback——Windows 微软雅黑、Mac 苹方、Android Noto，三个设备三种样子。改为自托管 **Noto Serif SC（标题）+ Noto Sans SC（正文）+ Inter（拉丁）**，全部手动子集化。

## Considered Options

- **MiSans / HarmonyOS Sans**——观感更好、字重更齐，但两家的「免费商用」条款都**限制独立分发**，而网页自托管字体文件本质就是向访客分发。商业站踩这个不值。
- **继续系统 fallback**——零成本，但这是一个卖设计的工作室，同行一眼看得出来。

## Consequences

- 授权已核对到一手出处：`notofonts/noto-cjk` 仓库的 `Sans/LICENSE` 与 `Serif/LICENSE` 均为 **SIL Open Font License 1.1**。允许商用、自托管、子集化（属「修改」）、嵌入网页，无需付费、无需申请。
- **唯一的合规动作**：OFL 第 2 条要求随字体分发附带许可证全文。许可证放进 `public/fonts/`，并在页脚给一行链接。
- 中文标题用宋体是为了在中文语境下逼近 ERA 的 editorial 质感（中文没有 Didone 对应物）；「衬线 = 婚礼感」的风险来自花体，不来自衬线。

## 更正（2026-07-27，实施时实测）

本 ADR 立项时写的两条被实测推翻。

### ① Reserved Font Name —— 原文说「未声明」，错了

原文写着「该 LICENSE 文件内未声明 Reserved Font Name，因此子集化后的命名不受限制」。那是基于 `notofonts/noto-cjk` 里的裸 LICENSE 文件。**但实际分发用的 google/fonts 版本声明了 RFN：**

| 字体 | 版权行 |
|---|---|
| Noto Sans SC | `Copyright 2014-2021 Adobe, with Reserved Font Name 'Source'` |
| Noto Serif SC | `Copyright 2012 Google Inc. All Rights Reserved.`（未声明 RFN） |

黑体声明了 RFN **`'Source'`** —— 因为它源自 Adobe 的思源黑体 Source Han Sans。

**结论不变（我们合规），但理由变了。** OFL 第 3 条原文：「No Modified Version ... may use the Reserved Font Name(s) ... **This restriction only applies to the primary font name as presented to the users.**」我们的子集沿用 `Noto Sans SC` 这个主字体名，不含 `Source`，因此满足第 3 条。

👉 **将来给子集改名时，名字里不要出现 `Source`。**

👉 两份 OFL 的版权方不同（Adobe / Google），**必须各放一份**，不能只放一个。仓库里放了 `OFL-NotoSansSC.txt`、`OFL-NotoSerifSC.txt` 与供页脚链接的合并版 `LICENSES.txt`。

### ② 体积 —— 原文估「80~120KB」，实测做不到

CJK 每字形在 woff2 里约 **130 字节**，与子集化参数几乎无关（试过 `--layout-features`、`--desubroutinize`、丢表，全部相差不到 2%）。实测 511 字：

| 文件 | 体积 |
|---|---|
| NotoSansSC-400 | 70.0 KB |
| NotoSansSC-600 | 71.2 KB |
| NotoSerifSC-600 | 88.8 KB |
| **合计** | **230.0 KB** |

压到 150KB 以内只有两条路，代价都比多出的 80KB 大：

- **砍掉 600 字重** → 浏览器对中文做合成粗体，糊得很明显
- **宋体只裁标题字**（258 字，省 52KB）→ 标题字集要靠猜哪些字段算标题，以后新写的标题一旦用到集外的字，那个字会在标题中间掉回黑体

因此**采用 230KB 方案，并修正预算数字**。真正的约束是 [ADR-0008](./0008-performance-budget.md) 的首屏总重 < 800KB —— 不含字体约 146KB，加字体后 ~376KB，余量充足。

已做的优化：不打 500 字重（中文 medium 与 normal 几乎无差，浏览器回落到 400，省 71KB）· `font-display: swap` · 只预加载正文字重 · `unicode-range` 限定中日韩，纯拉丁内容不触发下载。

### ③ 子集脚本必须剥掉注释

这个仓库的源码注释是中文写的。第一版脚本直接扫源文件，把**注释里的中文**也打进了字形 —— 加几行 CSS 注释就多出 55 个字、50KB。脚本现在先剥 `/* */` 与 `//` 注释再扫。

### 生成方式

源字体是 17MB / 24MB 的可变字体，**不进仓库**；生成好的 woff2 **提交进版本库**（构建机没有源字体，无法重新生成）。需要重新生成时按 `scripts/subset-fonts.mjs` 的提示下载源字体后运行 `npm run fonts`。
