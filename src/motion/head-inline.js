/**
 * 必须在首帧之前执行的那一小段。**内联进每个页面的 <head>**，不是外部脚本 ——
 * 外部脚本要多一次阻塞渲染的请求，为几百个字节不值得。
 *
 * 一份源码，两个去处：
 *   - 核心页：`src/components/Shell.tsx` 构建期读进来内联
 *   - 内容页与独立静态页：`scripts/inject-motion.mjs` 构建期注入
 * 写两份迟早会漂移，而漂移的表现是「有的页面有幕布、有的白屏硬跳」——
 * ADR-0001 说这比完全没有更糟。
 *
 * 这里只做三件事，都必须早于首帧：
 *   1. 注入幕布的样式（幕布落在 html::after 上，不往 DOM 里塞元素）
 *   2. 上一页盖上幕布才揭幕 —— 直达访问不盖，盖了会把最大内容绘制推后
 *   3. 给逐行揭示上预备态
 */
(function () {
  var d = document.documentElement;

  var s = document.createElement("style");
  s.textContent =
    "html::after{content:'';position:fixed;inset:0;z-index:9999;" +
    "background:#07080b;opacity:0;pointer-events:none;transition:opacity .42s ease}" +
    "html.curtain-covered::after{opacity:1}";
  document.head.appendChild(s);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // 幕布：只有上一页真的盖上了才揭。标记由 /js/motion.js 在离开前写下
  try {
    if (sessionStorage.getItem("h2od-curtain")) d.classList.add("curtain-covered");
  } catch (e) {}

  // 逐行揭示的预备态，见 globals.css 的 .reveal-armed
  d.classList.add("reveal-armed");

  // 兜底：动效脚本没能加载时，幕布与预备态都必须自己散掉。
  // 这个站的流量全靠文字被读到，不能赌 chunk 一定加载成功。
  setTimeout(function () {
    d.classList.remove("curtain-covered");
  }, 2500);
  setTimeout(function () {
    d.classList.remove("reveal-armed");
  }, 4000);
})();
