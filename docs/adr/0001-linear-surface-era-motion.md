# 视觉走 Linear，动效走 ERA Residence

重做官网时想要「Linear 那种高级感」，同时想要 awwwards 站 [era-residence.com](https://www.era-residence.com/) 的滚动质感。实测后确认两者的**视觉**语言互斥——ERA 是暖米白 `#F3F3EC` + Didone 衬线巨标题 + 手写花体的地中海奢侈品语言，Linear 是冷暗底 + Inter + hairline 的 SaaS 语言。因此**只取 Linear 的外观，只取 ERA 的动效手法**。

## Considered Options

- **改走 ERA 视觉**——中文没有 Didone 对应物，中英双语排版会痛，且现有暗色 token 与 4 份首页原型全部作废。
- **混合（暗底 + Didone 巨标题 + 花体）**——容易做成「暗色版婚礼请柬」，与工作室自己的婚礼业务线撞色，主站与产品线分不开。

## Consequences

- ERA 实测数据表明它的「高级」并不来自视差：183 个 ScrollTrigger 中 **pin = 0**，26 处 `data-parallax` 全是同一招遮罩位移，真正的主力是 **121 处 scroll-reveal** + Lenis 惯性 + 巨标题排版。因此本站动效预算优先投在逐行揭示与滚动手感，视差是配料。
- ERA 首页 25.5 屏的长度**不学**。本站 KPI 是 WhatsApp 点击，不是逗留时长；首页维持 7 个 section、8~10 屏。
- 借用的四样：Lenis 平滑滚动（仅桌面，`prefers-reduced-motion` 与移动端关闭）、遮罩视差、SplitText 逐行揭示、幕布转场。
- Lenis 与 `globals.css` 里的 `scroll-behavior: smooth` 冲突，后者必须删除。
- hero 主视觉是**液态球体像水母一样漂浮**的循环视频。它不是新发明的东西——现行站已经在用同一个形体（`assets/bg-1/2/3.webp`，1024×1024，`mix-blend-mode: screen` + 径向遮罩，`orbFloat` 16s 慢漂），分布在 hero ×2、services ×2、contact ×1 共 5 处。重做只是把它从背景装饰**提拔成主角**，品牌连续性优先于新鲜感。同时接上了水母题的末端：滴 → 涟漪 → 流 → 海 → 水母。
- 相对现状要升级三点：①现有 `orbFloat` 只做整体平移／旋转／缩放，**球体内部纹理是静止的**——水母感恰恰来自内部（膜的起伏、焦散流动、伞的收放），这是上视频的唯一理由；②1024×1024 当背景够用、当主角不够，需 2K 以上；③构图从「右侧溢出的装饰物」改为**跨过画面中线**，但标题与 WhatsApp CTA 所在的左侧始终保留一块干净暗区，球体只允许轻微探入。
- 两条硬约束：形体不得侵入标题与 CTA 安全区（参考海报里文字被色块吞掉，做海报可以，做转化页不行）；大面积平滑渐变在低码率下出色带，叠一层极淡的 CSS 噪点即可压掉，比换编码器省得多。
- 视频须渲染在**纯黑背景**上，沿用现有的 `mix-blend-mode: screen` 合成方式——无需 alpha 通道，编码格式选择不受限。
- GSAP 需从 `^3.12.5` 升到 `^3.13`——SplitText 等插件自 3.13 起随 Webflow 收购全部免费，且 3.13 的 SplitText 重写版自带屏幕阅读器无障碍。
- 幕布转场覆盖**全部**页面，包括仍是静态 HTML 的内容页：幕布盖满后不走路由而直接 `location.href` 真跳转，新页加载后揭开。只覆盖核心 4 页会造成「点 about 有幕布、点 blog 白屏硬跳」的不一致，比完全没有更糟。代价是要往 17 个静态页注入揭幕脚本。
