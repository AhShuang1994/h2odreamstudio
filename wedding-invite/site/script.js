/* Hui Huang & Mayyi — 3-screen parallax trial
   k = layer speed / page scroll speed. A fixed stage plus a tall #scroll-space give a
   normalized timeline t∈[0,1]:
     s1 vertical parallax → zoom-through gate → s2 vertical parallax
     → continuous crossfade → s3 HORIZONTAL pan (pond + photo gallery)
   Desktop pans sideways (scroll-driven). Portrait never hijacks: the strip is swiped. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  var mq = window.matchMedia("(max-width:820px)");

  var ASSETS = {
    desktop: {
      s1: { sky: "url('assets/s1-l0-sky-glow.webp')",
            L1: "assets/s1-desktop-L1-far-wall.webp",
            L2: "assets/s1-desktop-L2-side-foliage.webp",
            L3: "assets/s1-desktop-L3-vine-door.webp" },
      s2: { sky: "url('assets/s2-l0-sky.webp')",
            L1: "assets/s2-desktop-L1-far-trees.webp",
            L2: "assets/s2-desktop-L2-path-beds.webp",
            L3: "assets/s2-desktop-L3-near-drape.webp" },
      s3: { sky: "url('assets/s3-l0-sky.webp')",
            L2: "assets/s3-desktop-L2-pond-wide.webp",
            L3: "assets/s3-L3-near-waterplants.webp" },
      /* s4/s5 ship one image per layer for both breakpoints — the size difference is
         a CSS width multiplier, so there is nothing to swap here beyond the sky. */
      s4: { sky: "url('assets/s4-l0-sky.webp')",
            L1: "assets/s4-L1-far-trees.webp",
            L2: "assets/s4-L2-path-end.webp",
            L3: "assets/s4-L3-flower-arch.webp" },
      s5: { sky: "url('assets/s5-l0-sky-warm.webp')",
            L1: "assets/s5-L1-far-backdrop.webp",
            L2: "assets/s5-L2-seats.webp",
            L3: "assets/s5-L3-near-petals.webp" }
    },
    mobile: {
      s1: { sky: "radial-gradient(circle at 50% 32%, #EBD9B4 0%, #C7D4B8 55%, #6E8268 100%)",
            L1: "assets/s1-mobile-L1-far-wall.webp",
            L2: "assets/s1-mobile-L2-side-foliage.webp",
            L3: "assets/s1-mobile-L3-vine-door.webp" },
      s2: { sky: "linear-gradient(#F4EFE4 0%, #C7D4B8 55%, #8FA07E 100%)",
            L1: "assets/s2-mobile-L1-far-trees.webp",
            L2: "assets/s2-mobile-L2-path-beds.webp",
            L3: "assets/s2-mobile-L3-near-drape.webp" },
      s3: { sky: "linear-gradient(#C7D4B8 0%, #8FA07E 55%, #6E8268 100%)",
            L2: "assets/s3-mobile-L2-pond.webp",
            L3: "assets/s3-L3-near-waterplants.webp" },
      /* both gradients are sampled from the desktop sky paintings — the specs' original
         green/pink ramps came out far darker than desktop and read as a different scene */
      s4: { sky: "linear-gradient(#EAEEDB 0%, #E7EBD6 25%, #F3F2E2 50%, #D9DCBC 78%, #B9CCA4 100%)",
            L1: "assets/s4-L1-far-trees.webp",
            L2: "assets/s4-L2-path-end.webp",
            L3: "assets/s4-L3-flower-arch.webp" },
      s5: { sky: "linear-gradient(#EFE3C8 0%, #F2DEC4 26%, #EBC9B4 52%, #D9C9AE 78%, #A8B893 100%)",
            L1: "assets/s5-L1-far-backdrop.webp",
            L2: "assets/s5-L2-seats.webp",
            L3: "assets/s5-L3-near-petals.webp" }
    }
  };

  /* Gallery geometry is derived from the viewport, never hard-coded: a fixed 2540px
     strip is narrower than a 2K screen, which would leave zero pan distance. */
  var PHOTOS = 5, CARD_W = 420, CARD_GAP = 110, STRIP_W = 2540;
  var STRIP_MIN_VW = 1.55;                                   // strip is always ≥1.55 viewports
  var ANG = [-3, 2, -2, 3, -2];                              // gentle scatter

  var g = function (id) { return document.getElementById(id); };
  var el = {
    space: g("scroll-space"), hint: g("hint"),
    s1: { sky: g("s1-sky"), L1: g("s1-L1"), L2: g("s1-L2"), L3: g("s1-L3"),
          glow: g("s1-glow"), copy: g("s1-copy"), scene: g("s1") },
    s2: { sky: g("s2-sky"), L1: g("s2-L1"), L2: g("s2-L2"), L3: g("s2-L3"),
          copy: g("s2-copy"), scene: g("s2") },
    s3: { sky: g("s3-sky"), L2: g("s3-L2"), L3: g("s3-L3"),
          gallery: g("s3-gallery"), copy: g("s3-copy"), scene: g("s3") },
    s4: { sky: g("s4-sky"), L1: g("s4-L1"), L2: g("s4-L2"), L3: g("s4-L3"),
          copy: g("s4-copy"), scene: g("s4") },
    s5: { sky: g("s5-sky"), L1: g("s5-L1"), L2: g("s5-L2"), L3: g("s5-L3"),
          copy: g("s5-copy"), scene: g("s5") }
  };

  var mode, A, vh, vw, cards = [], mTops = null;

  /* portrait: cache each print's resting offset inside the column (cheap; re-read on resize) */
  function measureMobile() {
    mTops = [];
    for (var i = 0; i < cards.length; i++) {
      mTops.push({ t: cards[i].offsetTop, h: cards[i].offsetHeight });
    }
  }

  function buildGallery() {
    if (cards.length) return;
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= PHOTOS; i++) {
      var src = "assets/gallery/photo-" + i + ".webp";
      var fig = document.createElement("figure");
      var card = document.createElement("div");
      card.className = "card";
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Hui Huang & Mayyi 的合照 " + i;
      img.loading = "lazy";
      card.appendChild(img);
      // watercolour reflection under the print — portrait only, hidden on desktop
      var refl = document.createElement("img");
      refl.className = "refl";
      refl.src = src;
      refl.alt = "";
      refl.setAttribute("aria-hidden", "true");
      refl.loading = "lazy";
      fig.appendChild(card);
      fig.appendChild(refl);
      frag.appendChild(fig);
      cards.push(fig);
    }
    el.s3.gallery.appendChild(frag);
  }

  /* The last two screens are ~2.5MB and nobody sees them before t≈0.6, so they are
     fetched once the first screens have painted rather than competing with them. */
  var lateReady = false;
  function loadLate() {
    lateReady = true;
    if (!A) return;
    el.s4.L1.src = A.s4.L1; el.s4.L2.src = A.s4.L2; el.s4.L3.src = A.s4.L3;
    el.s5.L1.src = A.s5.L1; el.s5.L2.src = A.s5.L2; el.s5.L3.src = A.s5.L3;
  }

  function apply() {
    mode = mq.matches ? "mobile" : "desktop";
    A = ASSETS[mode];
    var bgTail = " center bottom / cover no-repeat";
    el.s1.sky.style.background = mode === "desktop" ? A.s1.sky + bgTail : A.s1.sky;
    el.s2.sky.style.background = mode === "desktop" ? A.s2.sky + bgTail : A.s2.sky;
    el.s3.sky.style.background = mode === "desktop" ? A.s3.sky + bgTail : A.s3.sky;
    // s5's sky is the top slice of a tall wash — anchor it to the TOP, not the bottom
    el.s4.sky.style.background = mode === "desktop" ? A.s4.sky + bgTail : A.s4.sky;
    el.s5.sky.style.background = mode === "desktop"
      ? A.s5.sky + " center top / cover no-repeat" : A.s5.sky;
    el.s1.L1.src = A.s1.L1; el.s1.L2.src = A.s1.L2; el.s1.L3.src = A.s1.L3;
    el.s2.L1.src = A.s2.L1; el.s2.L2.src = A.s2.L2; el.s2.L3.src = A.s2.L3;
    el.s3.L2.src = A.s3.L2; el.s3.L3.src = A.s3.L3;
    if (lateReady) loadLate();     // s4+s5 are ~2.5MB and not needed until t≈0.6
    buildGallery();
    mTops = null;                     // column geometry must be re-measured after a resize
    vh = window.innerHeight || document.documentElement.clientHeight || 800;
    vw = window.innerWidth || document.documentElement.clientWidth || 1200;
    // px fallback: a vh-only height collapses to 0 if the viewport reports 0 height
    el.space.style.height = Math.max(vh * 11, 6600) + "px";
    layoutGallery();
    onScroll();
  }

  /* size the cards + gaps off the viewport so the strip always overhangs the screen */
  function layoutGallery() {
    if (mode === "mobile") {                 // portrait surfaces photos vertically; CSS sizes them
      el.s3.gallery.style.gap = "";
      for (var m = 0; m < cards.length; m++) {
        cards[m].style.width = "";
        cards[m].querySelector("img").style.height = "";
      }
      STRIP_W = 0;
      layoutPanPlates();
      return;
    }
    CARD_W = Math.min(620, Math.round(vw * 0.28));
    var minStrip = vw * STRIP_MIN_VW;
    CARD_GAP = Math.max(Math.round(vw * 0.075),
                        Math.round((minStrip - PHOTOS * CARD_W) / (PHOTOS - 1)));
    CARD_GAP = Math.min(CARD_GAP, 700);
    STRIP_W = PHOTOS * CARD_W + (PHOTOS - 1) * CARD_GAP;
    el.s3.gallery.style.gap = CARD_GAP + "px";
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.width = CARD_W + "px";
      cards[i].querySelector("img").style.height = Math.round(CARD_W * 2 / 3) + "px";
    }
    layoutPanPlates();
  }

  var PAN_K = { L2: 0.40, L3: 0.85 };
  /* Each panning plate must span: viewport + its own travel + margin. Sizing it any
     other way lets the plate's right edge slide into frame at the end of the pan. */
  function sizePlate(node, k, fallbackAspect, minCoverH) {
    var panMax = Math.max(0, STRIP_W - vw);
    var aspect = (node.naturalWidth && node.naturalHeight)
      ? node.naturalWidth / node.naturalHeight : fallbackAspect;
    var needW = vw + panMax * k + 60;                 // never runs out
    var coverW = minCoverH * vh * aspect;             // still tall enough to cover
    var w = Math.max(needW, coverW);
    node.style.width = Math.round(w) + "px";
    node.style.height = "auto";
  }
  function layoutPanPlates() {
    if (mode === "mobile") {
      el.s3.L2.style.width = el.s3.L2.style.height = "";
      el.s3.L3.style.width = el.s3.L3.style.height = "";
      return;
    }
    sizePlate(el.s3.L2, PAN_K.L2, 1.778, 1.10);   // pond plate 2560×1440
    sizePlate(el.s3.L3, PAN_K.L3, 1.500, 0.70);   // foreground band 2496×1664
  }

  function tf(node, yPx, scale) {
    node.style.transform = "translate(-50%," + yPx.toFixed(1) + "px) scale(" + (scale == null ? 1 : scale).toFixed(3) + ")";
  }
  function skyTf(node, yPx, scale) {
    node.style.transform = "translateY(" + yPx.toFixed(1) + "px) scale(" + (scale == null ? 1 : scale).toFixed(3) + ")";
  }
  function panTf(node, xPx) { node.style.transform = "translateX(" + (-xPx).toFixed(1) + "px)"; }
  function easeInCubic(x) { return x * x * x; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* timeline gates — five screens on one normalized t∈[0,1] */
  var T1 = 0.13,   // s1 parallax ends, gate push-in begins
      T2 = 0.19,   // through the gate; s2 fully present
      T3 = 0.30,   // s2 parallax ends, continuous crossfade to s3 begins
      T4 = 0.35,   // s3 fully present; horizontal pan runs T4 → T5
      T5 = 0.60,   // pan done; crossfade to s4
      T6 = 0.65,   // s4 fully present, vertical parallax runs T6 → T7
      T7 = 0.80,   // s4 parallax ends, arch push-in begins
      T8 = 0.88;   // through the arch; s5 present, settles T8 → 1

  function render(t) {
    var down = reduce ? 0 : vh;

    /* ---------- S1: vertical parallax, then a camera dolly-in through the gate ---------- */
    var p1 = clamp(t / T1, 0, 1);
    var tr = clamp((t - T1) / (T2 - T1), 0, 1);
    var e = easeInCubic(tr);
    var camSky = reduce ? 1 : lerp(1, 1.08, e),
        camL1  = reduce ? 1 : lerp(1, 1.20, e),
        camL2  = reduce ? 1 : lerp(1, 1.55, e),
        camL3  = reduce ? 1 : lerp(1 + 0.04 * p1, 3.6, e);   // gate stays put, only grows
    skyTf(el.s1.sky, 0.02 * down * p1 * (1 - tr), camSky);
    tf(el.s1.L1, 0.05 * down * p1 * (1 - tr), camL1);
    tf(el.s1.L2, 0.09 * down * p1 * (1 - tr), camL2);
    tf(el.s1.L3, 0, camL3);

    var fadeLate = clamp((tr - 0.35) / 0.65, 0, 1);
    var s1fade = 1 - fadeLate;
    el.s1.sky.style.opacity = s1fade;
    el.s1.L1.style.opacity = s1fade;
    el.s1.L2.style.opacity = s1fade;
    el.s1.L3.style.opacity = 1 - clamp((tr - 0.6) / 0.4, 0, 1);
    el.s1.glow.style.opacity = 0.9 * (1 - fadeLate) * (0.4 + 0.6 * (1 - p1 * 0.3));
    // copy stays fully legible for the whole of its own screen; it only yields
    // during the handover to the next screen (otherwise two titles would overlap)
    el.s1.copy.style.opacity = clamp(1 - tr * 2.2, 0, 1);
    el.s1.scene.style.visibility = tr >= 1 ? "hidden" : "visible";

    /* ---------- S2: vertical parallax, then a continuous crossfade into s3 ---------- */
    var toS3 = clamp((t - T3) / (T4 - T3), 0, 1);
    el.s2.scene.style.opacity = fadeLate * (1 - toS3);
    el.s2.scene.style.visibility = (fadeLate <= 0 || toS3 >= 1) ? "hidden" : "visible";
    var p2 = clamp((t - T2) / (T3 - T2), 0, 1);
    skyTf(el.s2.sky, 0.02 * down * p2);
    tf(el.s2.L1, 0.05 * down * p2, 1);
    tf(el.s2.L2, 0.10 * down * p2, 1);
    tf(el.s2.L3, 0.16 * down * p2, 1);
    var c2 = clamp((t - T2 + 0.04) / 0.12, 0, 1);
    el.s2.copy.style.opacity = c2 * (1 - toS3);
    el.s2.copy.style.transform = "translate(-50%," + (-8 * c2).toFixed(1) + "px)";

    /* ---------- S3: horizontal pan — the camera turns and tracks along the bank ---------- */
    var toS4 = clamp((t - T5) / (T6 - T5), 0, 1);
    el.s3.scene.style.opacity = toS3 * (1 - toS4);
    el.s3.scene.style.visibility = (toS3 <= 0 || toS4 >= 1) ? "hidden" : "visible";
    var p3 = clamp((t - T4) / (T5 - T4), 0, 1);
    var panMax = Math.max(0, STRIP_W - vw);
    var panX = (mode === "mobile" || reduce) ? 0 : p3 * panMax;

    if (mode === "desktop" && !reduce) {
      /* landscape: the camera turns and tracks sideways along the bank */
      panTf(el.s3.L2, panX * PAN_K.L2);      // far pond drifts
      panTf(el.s3.L3, panX * PAN_K.L3);      // near bank plants sweep past
      panTf(el.s3.gallery, panX);            // photos travel fastest
      for (var i = 0; i < cards.length; i++) {
        var x = i * (CARD_W + CARD_GAP) - panX;
        // landscape keeps the tighter windows — prints stay crisp most of the way
        // across, and only let go near the edge (portrait fades much earlier, below)
        var ent = clamp((vw - x) / 460, 0, 1);           // surfaces from the right
        var exit = clamp((x + CARD_W) / 420, 0, 1);      // lets go near the left edge
        var o = ent * exit;
        cards[i].style.opacity = o;
        cards[i].style.transform =
          "translateY(" + ((1 - ent) * 12 + (1 - exit) * 10).toFixed(1) + "px) scale(" +
          (0.98 + 0.02 * Math.min(ent, exit)).toFixed(3) + ") rotate(" + ANG[i] + "deg)";
      }
    } else {
      /* portrait: memories surface out of the pond, one after another */
      el.s3.L2.style.transform = el.s3.L3.style.transform = "";
      if (mTops === null) measureMobile();
      var startY = vh * 0.86;                       // first print waits just under the surface
      var lastBottom = mTops.length ? mTops[mTops.length - 1].t : 0;
      var travel = reduce ? 0 : Math.max(0, startY + lastBottom - vh * 0.30);
      var colY = startY - p3 * travel;
      el.s3.gallery.style.transform = "translateX(-50%) translateY(" + colY.toFixed(1) + "px)";
      var line = vh * 0.80, win = vh * 0.30;        // the water surface, and the fade window
      for (var j = 0; j < cards.length; j++) {
        var topY = colY + mTops[j].t;
        var rise = reduce ? 1 : clamp((line - topY) / win, 0, 1);          // surfaces
        var sink = reduce ? 1 : clamp((topY + mTops[j].h) / (vh * 0.55), 0, 1);  // fades away early
        cards[j].style.opacity = rise * sink;
        cards[j].style.transform =
          "translateY(" + ((1 - rise) * 22 - (1 - sink) * 14).toFixed(1) + "px) scale(" +
          (0.96 + 0.04 * Math.min(rise, sink)).toFixed(3) +
          ") rotate(" + (ANG[j] * 0.6).toFixed(1) + "deg) translateX(" + (j % 2 ? 3 : -3) + "vw)";
      }
    }

    var c3 = clamp((t - T4 + 0.03) / 0.10, 0, 1);
    el.s3.copy.style.opacity = c3 * (1 - toS4);  // stays put for the whole pan

    /* ---------- S4: vertical parallax, then a dolly-in through the flower arch ---------- */
    var p4 = clamp((t - T6) / (T7 - T6), 0, 1);
    var tr4 = clamp((t - T7) / (T8 - T7), 0, 1);
    var e4 = easeInCubic(tr4);
    var a4Sky = reduce ? 1 : lerp(1, 1.06, e4),
        a4L1  = reduce ? 1 : lerp(1, 1.18, e4),
        a4L2  = reduce ? 1 : lerp(1, 1.50, e4),
        a4L3  = reduce ? 1 : lerp(1 + 0.03 * p4, 3.2, e4);   // arch stays put, only grows
    skyTf(el.s4.sky, 0.02 * down * p4 * (1 - tr4), a4Sky);
    tf(el.s4.L1, 0.05 * down * p4 * (1 - tr4), a4L1);
    tf(el.s4.L2, 0.10 * down * p4 * (1 - tr4), a4L2);
    tf(el.s4.L3, 0, a4L3);

    var late4 = clamp((tr4 - 0.35) / 0.65, 0, 1);
    var s4fade = 1 - late4;
    el.s4.sky.style.opacity = s4fade;
    el.s4.L1.style.opacity = s4fade;
    el.s4.L2.style.opacity = s4fade;
    el.s4.L3.style.opacity = 1 - clamp((tr4 - 0.6) / 0.4, 0, 1);
    el.s4.scene.style.opacity = toS4;
    el.s4.scene.style.visibility = (toS4 <= 0 || tr4 >= 1) ? "hidden" : "visible";
    var c4 = clamp((t - T6 + 0.03) / 0.08, 0, 1);
    el.s4.copy.style.opacity = c4 * clamp(1 - tr4 * 2.2, 0, 1);

    /* ---------- S5: arrival. Settles, then the outro block scrolls over it ---------- */
    var p5 = clamp((t - T8) / (1 - T8), 0, 1);
    var settle = reduce ? 1 : 1 - p5;            // the last of the push-in bleeds off
    skyTf(el.s5.sky, 0, 1 + 0.03 * settle);
    tf(el.s5.L1, 0.03 * down * p5, 1 + 0.05 * settle);
    tf(el.s5.L2, 0.06 * down * p5, 1 + 0.09 * settle);
    tf(el.s5.L3, 0.10 * down * p5, 1 + 0.14 * settle);
    el.s5.copy.style.opacity = clamp((t - T8 + 0.02) / 0.06, 0, 1);

    el.hint.style.opacity = clamp(0.8 - t * 10, 0, 0.8);
  }

  function onScroll() {
    vh = window.innerHeight || document.documentElement.clientHeight || 800;
    vw = window.innerWidth || document.documentElement.clientWidth || 1200;
    // the timeline ends where #scroll-space ends; the outro below just scrolls over the stage
    var max = el.space.offsetHeight - vh;
    render(max > 0 ? clamp(window.scrollY / max, 0, 1) : 0);
  }

  /* RSVP: no backend on the trial site — the form only confirms locally.
     TODO wire to a real endpoint (Formspree / Google Form / Worker) before sending it out. */
  var rsvp = document.getElementById("rsvp-form");
  if (rsvp) {
    rsvp.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = document.getElementById("rsvp-msg");
      var name = rsvp.elements.name.value.trim();
      if (!name) { msg.textContent = "先留个称呼吧 🙂"; rsvp.elements.name.focus(); return; }
      msg.textContent = rsvp.elements.going.value === "yes"
        ? "收到了,我们留位 —— " + name
        : "收到了,谢谢你告诉我们 —— " + name;
      rsvp.querySelector("button").disabled = true;
    });
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { onScroll(); ticking = false; }); }
  }, { passive: true });
  window.addEventListener("resize", apply);
  if (mq.addEventListener) mq.addEventListener("change", apply);

  // re-measure once the plates decode, so real aspect ratios replace the fallbacks
  el.s3.L2.addEventListener("load", layoutPanPlates);
  el.s3.L3.addEventListener("load", layoutPanPlates);

  apply();
  window.addEventListener("load", function () { loadLate(); apply(); });
  window.addEventListener("scroll", loadLate, { once: true, passive: true });
})();
