/**
 * 全站动效外壳 —— 平滑滚动惯性 + 幕布转场。
 *
 * 为什么是一份手写的原生脚本、而不是 React 组件：内容页是纯静态 HTML、没有
 * 打包器，而 ADR-0001 要求幕布**覆盖全部页面**（只覆盖核心页会造成「点关于页
 * 有幕布、点 blog 白屏硬跳」，比完全没有更糟）。写成 React 一份、原生一份，
 * 两边迟早会漂移，所以核心页也走这一份，React 那边不再重复实现。
 *
 * 依赖 /js/lenis.min.js 先加载（两个都是 defer，defer 保序）。缺了它只是
 * 没有惯性，幕布照常工作。
 *
 * 逐行揭示不在这里 —— 它只跑在核心页上，走 React 那条动态 import 的链路。
 */
(function () {
  "use strict";

  var root = document.documentElement;
  // 与 src/lib/motion.ts 同一套判定。那边给 React 用，这边给静态页用，
  // 改一处就要改另一处。
  var REDUCED = "(prefers-reduced-motion: reduce)";
  var SMOOTH_OK = "(min-width: 1024px) and (pointer: fine)";
  var COVERED = "curtain-covered";
  var FLAG = "h2od-curtain";
  /** 与 head-inline.js 里那条 transition 的时长一致。 */
  var CURTAIN_MS = 420;

  function reduced() {
    return window.matchMedia(REDUCED).matches;
  }

  // ── 平滑滚动 ──────────────────────────────────────────────────────
  // 仅桌面：触屏上系统原生手感更好，低端机接管滚动还会掉帧。见 ADR-0001。

  var lenis = null;

  function wantSmooth() {
    return !reduced() && window.matchMedia(SMOOTH_OK).matches;
  }

  function syncSmooth() {
    if (!window.Lenis) return;
    if (wantSmooth()) {
      if (!lenis) lenis = new window.Lenis({ autoRaf: true });
    } else if (lenis) {
      lenis.destroy();
      lenis = null;
    }
  }

  syncSmooth();
  // 拖窄窗口或在系统设置里打开减弱动态偏好，当场生效，不用等刷新
  window.matchMedia(REDUCED).addEventListener("change", syncSmooth);
  window.matchMedia(SMOOTH_OK).addEventListener("change", syncSmooth);

  // ── 幕布转场 ──────────────────────────────────────────────────────

  function clearFlag() {
    try {
      sessionStorage.removeItem(FLAG);
    } catch (e) {}
  }

  /** 揭幕。盖住的状态由 head-inline.js 在首帧之前给上。 */
  clearFlag();
  root.classList.remove(COVERED);

  var leaving = false;

  function cover(url) {
    if (leaving) return; // 快速连点：第一次点击说了算
    leaving = true;
    try {
      sessionStorage.setItem(FLAG, "1");
    } catch (e) {}
    root.classList.add(COVERED);
    setTimeout(function () {
      window.location.href = url;
    }, CURTAIN_MS);
    // 跳转没能发生时把幕布收回去，别把人困在一块色板后面
    setTimeout(function () {
      leaving = false;
      clearFlag();
      root.classList.remove(COVERED);
    }, CURTAIN_MS + 2500);
  }

  /** 这次点击该不该换页？不该就返回 null，交回浏览器默认行为。 */
  function targetOf(event) {
    if (event.defaultPrevented || event.button !== 0) return null;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

    var el = event.target;
    var a = el && el.closest ? el.closest("a[href]") : null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return null;

    var url;
    try {
      url = new URL(a.href, window.location.href);
    } catch (e) {
      return null;
    }
    // 外链、mailto:、tel:、WhatsApp —— 都不是换页
    if (url.origin !== window.location.origin) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // 同页锚点交给浏览器，换页才盖幕布
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return null;
    }
    return url.href;
  }

  // ⚠️ 捕获阶段。核心页的站内链接是 next/link，它自己会 preventDefault 走
  // 客户端路由 —— 冒泡阶段轮到我们时已经晚了。抢在它前面 preventDefault，
  // next/link 看到事件已被拦下就不再接管，链接全部收成「盖幕布 → 真跳转」。
  // 这正是 ADR-0001 要的：不走路由，换页行为在核心页与静态内容页之间一致。
  //
  // 只 preventDefault、**不** stopPropagation —— 别的组件挂在链接上的
  // onClick（语言切换写 localStorage、手机菜单收起）还得照常跑完。
  document.addEventListener(
    "click",
    function (event) {
      if (reduced()) return;
      var url = targetOf(event);
      if (!url) return;
      event.preventDefault();
      cover(url);
    },
    true,
  );

  // 回退 / 前进：从 bfcache 恢复的页面可能还盖着上一次的幕布
  window.addEventListener("pageshow", function () {
    leaving = false;
    clearFlag();
    root.classList.remove(COVERED);
  });
})();
