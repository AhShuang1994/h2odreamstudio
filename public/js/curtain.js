/**
 * 幕布转场 —— 一块色板盖满视口 → 换页 → 揭开。
 *
 * 这个文件同时服务两种页面：Next 渲染的核心页（Shell 在 <head> 里引它）与
 * 仍是静态 HTML 的内容页（scripts/split-content-lang.mjs 构建期注入）。
 * 一份实现两边共用，是因为「点关于页有幕布、点 blog 白屏硬跳」比完全没有
 * 幕布更糟 —— 见 #66 的四样动效第 4 条。
 *
 * 幕布盖满之后**不走路由，直接触发真实跳转**：静态内容页本来就没有路由，
 * 只有真实跳转才能让两种页面的行为完全一致。核心页因此也变成整页加载 ——
 * 这是明知的代价，换取全站一致。
 *
 * 三条硬约束：
 *   1. 减弱动态偏好下整套关掉，链接恢复浏览器默认行为。
 *   2. 幕布画在 <html> 的 ::after 上，不插 DOM 节点 —— 脚本在 <head> 里同步
 *      执行时 body 还不存在，而「带着幕布到达」必须在首次绘制之前就成立，
 *      否则会先闪一下新页内容再盖上。
 *   3. 揭开有独立于任何事件的兜底定时器。JS 挂了也不能把访客锁在幕布后面。
 */
(function () {
  "use strict";

  var COVER_MS = 420; // 盖满：快，别让人等
  var REVEAL_MS = 560; // 揭开：慢一点，新页面从底下浮出来
  var FAILSAFE_MS = 1500; // 兜底揭幕，与任何事件无关
  var FLAG = "h2od-curtain"; // 跨页传递「我是带着幕布来的」

  var C = "h2od-curtain";
  var C_IN = "h2od-curtain-in";
  var C_OUT = "h2od-curtain-out";

  var doc = document;
  var root = doc.documentElement;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var style = doc.createElement("style");
  style.textContent =
    "html." +
    C +
    "::after{content:'';position:fixed;inset:0;z-index:2147483000;background:#07080b;" +
    "border-top:2px solid #7c82f0;transform:translateY(100%);pointer-events:auto}" +
    "html." +
    C +
    "." +
    C_IN +
    "::after{transform:translateY(0);transition:transform " +
    COVER_MS +
    "ms cubic-bezier(.6,0,.2,1)}" +
    "html." +
    C +
    "." +
    C_OUT +
    "::after{transform:translateY(-100%);transition:transform " +
    REVEAL_MS +
    "ms cubic-bezier(.3,0,0,1)}";
  (doc.head || root).appendChild(style);

  var navigating = false;

  function clear() {
    root.classList.remove(C, C_IN, C_OUT);
  }

  function reveal() {
    if (!root.classList.contains(C)) return;
    root.classList.add(C_OUT);
    window.setTimeout(clear, REVEAL_MS + 80);
  }

  function cover(href) {
    if (navigating) return;
    navigating = true;
    try {
      sessionStorage.setItem(FLAG, "1");
    } catch (e) {}
    root.classList.add(C);
    void root.offsetWidth; // 强制回流：下面这行才是一次真正的过渡，而不是初始状态
    root.classList.add(C_IN);
    window.setTimeout(function () {
      location.href = href;
    }, COVER_MS);
  }

  /** 这次点击该不该被幕布接管。任何一条不确定的都放行给浏览器。 */
  function targets(e, a) {
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.hasAttribute("download") || a.hasAttribute("data-no-curtain")) return false;
    if (a.target && a.target !== "_self") return false;

    var url;
    try {
      url = new URL(a.href, location.href);
    } catch (err) {
      return false;
    }
    // 站外、mailto:、tel:、wa.me —— 都不是换页
    if (url.origin !== location.origin) return false;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    // 同页锚点交给浏览器：幕布只管换页，不管页内跳转
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return url.href;
  }

  doc.addEventListener(
    "click",
    function (e) {
      var el = e.target;
      var a = el && el.closest ? el.closest("a[href]") : null;
      if (!a) return;
      var href = targets(e, a);
      if (!href) return;
      // Next 的 Link 会检查 defaultPrevented 后让开，静态页本来就没有别的处理
      e.preventDefault();
      cover(href);
    },
    true,
  );

  // —— 带着幕布到达 ————————————————————————————————————————————
  var arriving = false;
  try {
    arriving = sessionStorage.getItem(FLAG) === "1";
    if (arriving) sessionStorage.removeItem(FLAG);
  } catch (e) {}

  if (arriving) {
    // 两个类一起加：没有状态变化就没有过渡，页面从「已盖满」开始
    root.classList.add(C, C_IN);
    window.setTimeout(reveal, FAILSAFE_MS); // 兜底，与下面的事件互不依赖
    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", function () {
        requestAnimationFrame(reveal);
      });
    } else {
      requestAnimationFrame(reveal);
    }
  }

  // 回退键从 bfcache 恢复时，页面可能停在盖满状态 —— 一律清干净
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      navigating = false;
      clear();
    }
  });
})();
