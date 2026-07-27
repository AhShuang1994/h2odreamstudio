# 中文自托管思源黑体／思源宋体子集，排除 MiSans 与 HarmonyOS Sans

`layout.tsx` 只加载了 `Inter({ subsets: ["latin"] })`，中文全部落到系统 fallback——Windows 微软雅黑、Mac 苹方、Android Noto，三个设备三种样子。改为自托管 **Noto Serif SC（标题）+ Noto Sans SC（正文）+ Inter（拉丁）**，全部手动子集化。

## Considered Options

- **MiSans / HarmonyOS Sans**——观感更好、字重更齐，但两家的「免费商用」条款都**限制独立分发**，而网页自托管字体文件本质就是向访客分发。商业站踩这个不值。
- **继续系统 fallback**——零成本，但这是一个卖设计的工作室，同行一眼看得出来。

## Consequences

- 授权已核对到一手出处：`notofonts/noto-cjk` 仓库的 `Sans/LICENSE` 与 `Serif/LICENSE` 均为 **SIL Open Font License 1.1**。允许商用、自托管、子集化（属「修改」）、嵌入网页，无需付费、无需申请。
- **唯一的合规动作**：OFL 第 2 条要求随字体分发附带许可证全文。把 `OFL.txt` 放进 `public/fonts/`，并在页脚或 `/terms` 加一行链接。
- 该 LICENSE 文件内未声明 Reserved Font Name，因此子集化后的命名不受限制。
- 本站文案写死在 `src/content/*.ts`，可在构建期扫出全站实际用到的汉字（通常几百个）只打这部分子集，两套合计约 80~120KB，而非完整思源字体的 10MB 级。这是静态站独有的便宜，动态站做不到。
- 中文标题用宋体是为了在中文语境下逼近 ERA 的 editorial 质感（中文没有 Didone 对应物）；「衬线 = 婚礼感」的风险来自花体，不来自衬线。
