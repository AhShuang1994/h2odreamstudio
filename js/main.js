// H2ODreamer Studio — main.js (Organic Fluid + Micro-interactions)

// Navbar scroll background
(function () {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => {
    if (window.scrollY > 20) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(onScroll);
})();

// Reliable anchor scrolling — offsets the fixed navbar and survives layout
// shifts from async CSS / web fonts / lazy-loaded images / reveal animations
// that otherwise leave native hash scroll short of the target.
(function () {
  function offset() {
    const nav = document.querySelector('.navbar');
    return (nav ? nav.offsetHeight : 64) + 18;
  }
  function absTop(el) { // layout position, immune to reveal transforms
    let y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }
  function go(id, smooth) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = absTop(el) - offset();
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Keep the target aligned while the page height keeps changing (lazy images,
  // fonts), but yield the moment the user scrolls themselves.
  let pinId = null, deadline = 0, lastH = 0, ro = null, yielded = false;
  function repin() {
    if (!pinId || yielded || Date.now() > deadline) return;
    const h = document.body.scrollHeight;
    if (h !== lastH) { lastH = h; go(pinId, false); } // only on real layout growth
  }
  function pin(id, ms) {
    pinId = id; deadline = Date.now() + ms; yielded = false;
    lastH = document.body.scrollHeight;
    if (window.ResizeObserver) {
      if (!ro) ro = new ResizeObserver(repin);
      ro.observe(document.body);
      setTimeout(function () { if (ro) ro.disconnect(); }, ms);
    }
  }
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { yielded = true; }, { passive: true });
  });

  // Intercept same-page hash links (capture phase: nav links stopPropagation on bubble)
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a) return;
    const m = a.getAttribute('href').match(/#([^#]+)$/);
    if (!m) return;
    let url;
    try { url = new URL(a.href, location.href); } catch (_) { return; }
    if (url.pathname !== location.pathname) return; // cross-page → let it navigate
    if (!document.getElementById(m[1])) return;
    e.preventDefault();
    history.pushState(null, '', '#' + m[1]);
    go(m[1], true);
    pin(m[1], 1400);
  }, true);

  // Landed on the page with a hash (e.g. index.html#portfolio from another page).
  if (location.hash.length > 1) {
    const id = location.hash.slice(1);
    window.addEventListener('load', function () {
      go(id, false);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { go(id, false); });
      pin(id, 3000);
    });
  }
})();

// Mobile hamburger toggle
(function () {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    links.classList.toggle('open');
  });
  links.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
  document.addEventListener('click', () => {
    links.classList.remove('open');
  });
})();

// Nav dropdown: hover on desktop (CSS), tap-to-expand on mobile
(function () {
  const parents = document.querySelectorAll('.nav-links .has-dropdown');
  if (!parents.length) return;
  const mq = window.matchMedia('(max-width: 768px)');
  parents.forEach((li) => {
    const trigger = li.querySelector('.nav-parent');
    if (!trigger) return;
    function toggle() {
      const open = li.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    trigger.addEventListener('click', (e) => {
      if (!mq.matches) return; // desktop uses hover
      e.stopPropagation();
      toggle();
    });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  // collapse submenus when a submenu link is clicked (mobile menu closes too)
  document.querySelectorAll('.nav-links .dropdown-menu a').forEach((a) => {
    a.addEventListener('click', () => parents.forEach((li) => li.classList.remove('open')));
  });
})();

// FAQ accordion — only one open at a time
(function () {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;
  items.forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        items.forEach(other => {
          if (other !== item && other.open) other.open = false;
        });
      }
    });
  });
})();

// Mobile lang-toggle: clone into burger menu
(function () {
  const mq = window.matchMedia('(max-width: 768px)');
  const langBtn = document.getElementById('langToggle');
  const navLinks = document.getElementById('navLinks');
  if (!langBtn || !navLinks) return;

  let clone = null;
  function sync() {
    if (mq.matches && !clone) {
      clone = langBtn.cloneNode(true);
      clone.removeAttribute('id');
      clone.classList.add('lang-toggle-mobile');
      const li = document.createElement('li');
      li.appendChild(clone);
      navLinks.appendChild(li);
      clone.addEventListener('click', () => langBtn.click());
    } else if (!mq.matches && clone) {
      clone.closest('li').remove();
      clone = null;
    }
  }
  mq.addEventListener('change', sync);
  sync();
})();

// Language toggle
(function () {
  const STORAGE_KEY = 'h2od-lang';
  const toggle = document.getElementById('langToggle');
  if (!toggle) return;

  let cjkFontLoaded = false;
  function loadCJKFont() {
    if (cjkFontLoaded) return;
    cjkFontLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap';
    document.head.appendChild(link);
  }

  function applyLang(lang) {
    if (lang === 'cn') loadCJKFont();
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.lang = lang === 'cn' ? 'zh' : 'en';

    document.querySelectorAll('[data-lang-en], [data-lang-cn]').forEach(el => {
      const en = el.getAttribute('data-lang-en');
      const cn = el.getAttribute('data-lang-cn');
      if (lang === 'en' && en !== null) el.innerHTML = en;
      else if (lang === 'cn' && cn !== null) el.innerHTML = cn;
    });

    toggle.querySelector('.lang-en').classList.toggle('active', lang === 'en');
    toggle.querySelector('.lang-cn').classList.toggle('active', lang === 'cn');
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  let initialLang = 'en';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'cn') initialLang = stored;
  } catch (e) {}
  applyLang(initialLang);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-lang') || 'cn';
    applyLang(current === 'cn' ? 'en' : 'cn');
  });
})();

// Scroll reveal with varied entrance directions — deferred to avoid blocking first paint
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const journeyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const items = entry.target.querySelectorAll('.journey-item');
          items.forEach(item => item.classList.add('revealed'));
          journeyObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  const journey = document.querySelector('.journey');
  if (journey) journeyObserver.observe(journey);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const parent = entry.target.closest('.section-inner, .journey, .pain-grid, .service-grid, .faq-list');
          if (parent) {
            const siblings = parent.querySelectorAll('.reveal:not(.revealed)');
            siblings.forEach((sib, idx) => {
              sib.style.setProperty('--reveal-delay', (idx * 120) + 'ms');
            });
          }
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  function initReveal() {
    document.querySelectorAll('.story, .pain, .process, .services, .portfolio, .faq, .contact').forEach(s => {
      s.classList.add('reveal', 'reveal-up');
    });
    document.querySelectorAll('.pain-card').forEach(el => el.classList.add('reveal', 'reveal-scale'));
    document.querySelectorAll('.service-card').forEach(el => el.classList.add('reveal', 'reveal-rotate'));
    document.querySelectorAll('.faq-item').forEach(el => el.classList.add('reveal', 'reveal-right'));
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(initReveal, { timeout: 200 });
  } else {
    setTimeout(initReveal, 0);
  }
})();

// 3D Card Tilt on hover (service cards + pain cards)
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const cards = document.querySelectorAll('.service-card, .pain-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => { card.style.transition = ''; }, 400);
    });
  });
})();

// Parallax floating blobs + hero elements
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const blobs = document.querySelectorAll('.blob');
  const heroDrop = document.querySelector('.hero-drop');
  const heroInner = document.querySelector('.hero-inner');
  if (!blobs.length && !heroDrop) return;

  const rates = [0.15, 0.25, 0.1, 0.2, 0.12];
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      blobs.forEach((blob, i) => {
        const rate = rates[i] || 0.15;
        blob.style.transform = `translateY(${scrollY * rate}px)`;
      });
      if (heroDrop && scrollY < window.innerHeight) {
        heroDrop.style.transform = `translateY(${scrollY * -0.3}px)`;
      }
      if (heroInner && scrollY < window.innerHeight) {
        heroInner.style.transform = `translateY(${scrollY * 0.15}px)`;
        heroInner.style.opacity = Math.max(0, 1 - scrollY / (window.innerHeight * 0.8));
      }
      ticking = false;
    });
  }, { passive: true });
})();

// Scroll-linked storytelling — maps each section's scroll progress to a CSS
// var (--p, 0..1). CSS derives per-step --lit from it (see style.css). Pure JS
// so it works in every browser, unlike native animation-timeline.
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // .journey + .founder scrub simply as they cross the viewport —
  // a larger factor means the fill rises more slowly
  const targets = [
    { sel: '.journey', factor: 1.8 },
    { sel: '.founder', factor: 0.55 }
  ]
    .map(t => ({ el: document.querySelector(t.sel), factor: t.factor }))
    .filter(t => t.el);

  // The process timeline is pinned (position: sticky) on desktop: its extra-tall
  // track drives --p while the steps stay frozen on screen and light up one by
  // one. Same media query as the CSS so the two agree on when pinning is active.
  const processEl = document.querySelector('.process-timeline');
  const processTrack = document.querySelector('.pin-track');
  const processStick = document.querySelector('.pin-stick');
  const pinnedMQ = window.matchMedia('(min-width: 769px) and (min-height: 860px)');
  const PIN_TOP = 84;  // matches the CSS `.pin-stick { top: 84px }`

  if (!targets.length && !processEl) return;

  let ticking = false;
  function update() {
    const vh = window.innerHeight;
    const trigger = vh * 0.82;  // progress starts when element top crosses this line

    if (processEl && processTrack) {
      let p;
      if (pinnedMQ.matches && processStick) {
        // fraction scrolled through the pinned range (0 when the block freezes,
        // 1 when it releases). pinnable = how far the block travels while stuck =
        // track height minus the block's own height; PIN_TOP is where it freezes.
        const rect = processTrack.getBoundingClientRect();
        const pinnable = processTrack.offsetHeight - processStick.offsetHeight;
        p = pinnable > 0 ? (PIN_TOP - rect.top) / pinnable : 0;
      } else {
        // mobile: fall back to the plain crossing-the-viewport scrub
        const top = processEl.getBoundingClientRect().top;
        const span = Math.min(processEl.offsetHeight * 1.0, vh * 1.1) || 1;
        p = (trigger - top) / span;
      }
      processEl.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
    }

    targets.forEach(({ el, factor }) => {
      const top = el.getBoundingClientRect().top;
      const span = Math.min(el.offsetHeight * factor, vh * 1.1) || 1;
      const p = Math.min(1, Math.max(0, (trigger - top) / span));
      el.style.setProperty('--p', p.toFixed(3));
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
})();

// Magnetic cursor effect on CTA buttons
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const buttons = document.querySelectorAll('.btn-primary, .btn-wa, .btn-email');
  const PULL_DISTANCE = 80;
  const MAX_SHIFT = 6;

  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PULL_DISTANCE) {
        const strength = 1 - dist / PULL_DISTANCE;
        btn.style.transform = `translate(${dx * strength * 0.15}px, ${dy * strength * 0.15}px)`;
      }
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

// Ripple on CTA button click
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const buttons = document.querySelectorAll('.btn-primary, .btn-wa, .btn-email');
  buttons.forEach(btn => {
    btn.classList.add('ripple-container');
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100);
      const y = ((e.clientY - rect.top) / rect.height * 100);
      btn.style.setProperty('--ripple-x', x + '%');
      btn.style.setProperty('--ripple-y', y + '%');
      btn.classList.remove('rippling');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          btn.classList.add('rippling');
          setTimeout(() => btn.classList.remove('rippling'), 600);
        });
      });
    });
  });
})();

// GA4 Event Tracking for Lead Generation
(function () {
  function ga(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params);
  }

  // CTA clicks — WhatsApp (hero)
  var heroWa = document.querySelector('.hero .btn-primary');
  if (heroWa) heroWa.addEventListener('click', function () {
    ga('cta_whatsapp_hero', { event_category: 'lead', event_label: 'hero' });
  });

  // CTA clicks — WhatsApp (footer)
  var footerWa = document.querySelector('.contact .btn-wa');
  if (footerWa) footerWa.addEventListener('click', function () {
    ga('cta_whatsapp_footer', { event_category: 'lead', event_label: 'footer' });
  });

  // CTA clicks — Email
  var emailBtn = document.querySelector('.contact .btn-email');
  if (emailBtn) emailBtn.addEventListener('click', function () {
    ga('cta_email', { event_category: 'lead', event_label: 'email' });
  });

  // CTA clicks — Service cards
  document.querySelectorAll('.service-cta').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.service-card');
      var name = card ? card.querySelector('.service-name') : null;
      var tier = card ? card.getAttribute('data-tier') : '';
      var label = (name ? name.textContent.trim() : 'unknown') + (tier ? ' (' + tier + ')' : '');
      ga('cta_whatsapp_service', { event_category: 'lead', event_label: label });
    });
  });

  // Nav clicks
  document.querySelectorAll('#navLinks a').forEach(function (a) {
    a.addEventListener('click', function () {
      ga('nav_click', { event_category: 'navigation', event_label: a.getAttribute('href') });
    });
  });

  // FAQ opens
  document.querySelectorAll('.faq-item').forEach(function (item, i) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        var q = item.querySelector('summary');
        ga('faq_open', { event_category: 'engagement', event_label: q ? q.textContent.trim().slice(0, 80) : 'faq_' + i });
      }
    });
  });

  // Language switch
  var langToggle = document.getElementById('langToggle');
  if (langToggle) langToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-lang') || 'en';
    ga('lang_switch', { event_category: 'engagement', event_label: current === 'cn' ? 'to_en' : 'to_cn' });
  });

  // Section visibility — high-intent sections
  var tracked = {};
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !tracked[entry.target.id]) {
        tracked[entry.target.id] = true;
        ga('section_view', { event_category: 'engagement', event_label: entry.target.id });
        sectionObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  ['services', 'portfolio', 'contact'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  // Scroll depth
  var depthFired = {};
  window.addEventListener('scroll', function () {
    var pct = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
    [25, 50, 75, 100].forEach(function (milestone) {
      if (pct >= milestone && !depthFired[milestone]) {
        depthFired[milestone] = true;
        ga('scroll_depth', { event_category: 'engagement', event_label: milestone + '%' });
      }
    });
  }, { passive: true });

  // Demo button clicks (detail pages)
  document.querySelectorAll('.demo-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.showcase-item');
      var caption = item ? item.querySelector('.showcase-item-caption span') : null;
      ga('demo_click', { event_category: 'engagement', event_label: caption ? caption.textContent.trim() : 'unknown' });
    });
  });

  // Detail page CTA
  var detailWa = document.querySelector('.detail-cta .btn-wa');
  if (detailWa) detailWa.addEventListener('click', function () {
    ga('detail_cta_whatsapp', { event_category: 'lead', event_label: document.title });
  });

  // Service detail link clicks (homepage)
  document.querySelectorAll('.service-detail-link').forEach(function (link) {
    link.addEventListener('click', function () {
      ga('service_detail_click', { event_category: 'navigation', event_label: link.getAttribute('href') });
    });
  });
})();

// Portfolio: image protection + filter tabs + dynamic bento layout
(function () {
  var grid = document.querySelector('.portfolio-grid');
  var btns = document.querySelectorAll('.filter-btn');
  var items = document.querySelectorAll('.portfolio-grid .bento-item');
  if (!grid || !btns.length || !items.length) return;

  grid.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
  grid.addEventListener('dragstart', function (e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  function pickRandom(arr, n) {
    var copy = arr.slice();
    var result = [];
    for (var i = 0; i < n && copy.length; i++) {
      var idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  function applyLayout(filter) {
    var visible = [];
    items.forEach(function (item) {
      item.classList.remove('bento-hero', 'bento-wide', 'hidden');
      if (filter === 'all' || item.getAttribute('data-category') === filter) {
        visible.push(item);
      } else {
        item.classList.add('hidden');
      }
    });

    var count = visible.length;
    if (count === 0) return;

    var indices = [];
    for (var i = 0; i < count; i++) indices.push(i);
    var isCategory = filter !== 'all';

    if (isCategory) {
      grid.classList.add('bento-grid--category');
      var picked = pickRandom(indices, Math.min(2, count));
      visible[picked[0]].classList.add('bento-hero');
      if (picked[1] !== undefined) visible[picked[1]].classList.add('bento-wide');
    } else {
      // All: 3-col grid, 1 hero + dynamic wide to fill grid
      grid.classList.remove('bento-grid--category');
      var cells = count + 3;
      var wideNeeded = (3 - (cells % 3)) % 3;
      var picked = pickRandom(indices, 1 + wideNeeded);
      visible[picked[0]].classList.add('bento-hero');
      for (var i = 1; i < picked.length; i++) {
        visible[picked[i]].classList.add('bento-wide');
      }
    }
  }

  applyLayout('all');

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.getAttribute('data-filter');
      btns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyLayout(filter);
    });
  });
})();
