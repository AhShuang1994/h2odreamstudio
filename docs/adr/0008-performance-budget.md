# 性能预算：务实档

这个站的流量策略是 GEO，而 Core Web Vitals 是 Google 的排名信号——让动效把性能拖垮等于自己抵消自己的投入。上线前先框住数字，避免「每一步都合理、加完首屏五秒」。采用**务实档**：

| 指标 | 上限 |
|---|---|
| LCP（移动端 4G） | < 3s |
| INP | < 200ms |
| CLS | < 0.1 |
| 首屏 JS（gzip） | < 200KB |
| 首屏总重（gzip，不含 hero 视频） | < 800KB |

## Considered Options

- **严格档**（LCP<2.5s / JS<150KB / 总重<500KB）——按现有技术栈估算约 350KB，刚好达标但零余量，任何一次「图省事整包引入」都会破线。被否，因为余量比达标更值钱。
- **只守 Core Web Vitals 三项、不管字节数**——发现超标时代码已经写完，要回头拆。

## Consequences

- 现有技术栈的实测估算（gzip）：Next App Router + React 运行时 ~95KB，GSAP core + ScrollTrigger + SplitText ~43KB，Lenis ~3KB → JS 约 141KB；思源宋 + 思源黑子集 + Inter 拉丁约 120KB；HTML + CSS + hero poster 约 90KB。**首屏总计约 350KB**，务实档留出一倍余量。
- LCP < 3s 落在 Google 的「需要改进」区间而非「良好」。这是刻意接受的取舍：换来动效的实现自由度。若日后 GEO 流量对排名敏感，这条应当收紧到 2.5s。
- 预算约束下的三条硬要求，与本档无关、任何档位都必须做到：GSAP 按需引入而非整包；中文字体必须构建期子集化；hero 视频严格延到 LCP 之后加载，首屏由静态 poster 顶上。
