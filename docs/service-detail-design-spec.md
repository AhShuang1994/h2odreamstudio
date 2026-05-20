# H2ODreamer Studio — Service Detail Page Design Spec

Generated: 2026-05-15
Style: Deep Ocean Glass (extending existing homepage design system)
Breakpoints: mobile-first, 768px tablet, 1024px desktop

---

## A. Design Spec

### Page Structure (top to bottom)

1. **Navbar** — reused from homepage (same HTML/CSS)
2. **Back Link** — "← Back to Services" positioned above hero, inside section padding
3. **Detail Hero** — shorter than homepage hero (no min-height:100vh), centered text with badge, h1, subheadline, CTA
4. **Wave Divider** — reuse existing wave pattern
5. **Portfolio Showcase** — section heading + intro + grid of mockup frames (desktop + mobile pairs)
6. **Wave Divider**
7. **What's Included** — icon + title + description cards in responsive grid
8. **Wave Divider**
9. **Process Steps** — horizontal timeline (desktop) / vertical (mobile) with numbered circles and connectors
10. **Wave Divider**
11. **FAQ** — reuse existing .faq styles
12. **Final CTA** — reuse existing .contact section styles
13. **Footer** — reused from homepage

### Spacing & Typography (reusing existing tokens)

- Section padding: var(--section-padding-y) desktop / var(--section-padding-y-mobile) mobile
- Titles: var(--font-display), existing .section-title sizes
- Body: var(--font-body), 16-17px, line-height 1.75
- All colors from existing CSS custom properties
- 4/8px spacing rhythm maintained

### Key Component Details

**Detail Hero:**
- Background: same gradient as homepage but shorter (padding 140px top, 80px bottom on desktop; 100px/48px mobile)
- Badge: small pill, glassmorphism bg, border, 12px uppercase text
- H1: clamp(32px, 5vw, 56px) — smaller than homepage hero
- Subheadline: 17px, var(--color-text-secondary), max-width 600px
- CTA: reuse .btn-primary

**Mockup Desktop Frame:**
- Background: var(--color-bg-card)
- Top bar: 32px height, #1a2744 background
- 3 dots: 8px circles (red #FF5F57, yellow #FFBD2E, green #27C93F), 8px gap, 12px left
- Border-radius: 12px top, 8px bottom
- Box-shadow: 0 20px 60px rgba(0,0,0,0.4)
- Image: width 100%, border-radius 0 0 8px 8px
- Max-width: 700px on desktop

**Mockup Mobile Frame:**
- Max-width: 280px
- Border-radius: 24px
- Border: 3px solid #1a2744
- Top notch: 80px wide, 20px tall pill (pseudo-element)
- Image: border-radius 20px
- Box-shadow: 0 16px 48px rgba(0,0,0,0.35)

**Process Timeline:**
- Horizontal on desktop (flexbox), vertical on mobile
- Step number: 48px circle, 2px border with gradient (cyan→green), centered number
- Connector: 2px dashed line, var(--color-primary) at 0.3 opacity
- Desktop: horizontal line between circles
- Mobile: vertical line on left side, steps stacked

**What's Included Grid:**
- 1 col mobile, 2 col tablet (768px+), 4 col desktop (1024px+)
- Cards: glassmorphism (same as service cards but smaller padding)
- 40px emoji icon, h4 title, p description
- Hover: translateY(-4px) + cyan glow

---

## B. CSS Additions

Append everything below to the existing `style.css` / `style.min.css`.

```css
/* ============================================================
   SERVICE DETAIL PAGES — CSS additions
   Appended to existing style.css
   ============================================================ */

/* ============ BACK LINK ============ */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 12px 0;
  transition: color 200ms var(--ease-out-expo);
}
.back-link:hover {
  color: var(--color-primary);
}

/* ============ DETAIL HERO ============ */
.detail-hero {
  position: relative;
  background: linear-gradient(170deg,
    var(--color-bg-deep) 0%,
    #071428 40%,
    #0C2D5A 70%,
    var(--color-bg-mid) 100%);
  text-align: center;
  padding: 100px 20px 48px;
  overflow: hidden;
}
.detail-hero .hero-bg-glow {
  width: 500px;
  height: 280px;
}
.detail-hero .hero-inner {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
  z-index: 1;
}
.detail-hero .back-link {
  position: absolute;
  top: 72px;
  left: 24px;
  z-index: 2;
}
.hero-badge {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-primary);
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.2);
  padding: 6px 18px;
  border-radius: 50px;
  margin-bottom: 20px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.detail-hero h1 {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
  color: var(--color-text);
}
.detail-hero h1 em {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-style: normal;
}
.detail-hero .hero-sub {
  font-size: 17px;
  color: var(--color-text-secondary);
  line-height: 1.75;
  max-width: 600px;
  margin: 0 auto 32px;
}
.detail-hero .btn-primary {
  animation: none;
  opacity: 1;
}
.detail-hero .hero-price {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
}

@media (min-width: 768px) {
  .detail-hero {
    padding: 140px 24px 80px;
  }
  .detail-hero .back-link {
    top: 88px;
    left: 40px;
  }
}

/* ============ PORTFOLIO SHOWCASE ============ */
.portfolio-showcase {
  background: var(--color-bg-mid);
  padding: var(--section-padding-y-mobile) 20px;
  position: relative;
}
.portfolio-showcase .section-body {
  margin-bottom: 48px;
}
.showcase-grid {
  display: flex;
  flex-direction: column;
  gap: 48px;
  max-width: 1000px;
  margin: 0 auto;
}
.showcase-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
.showcase-item-frames {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 24px;
  width: 100%;
}
.showcase-item-caption {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
}
.showcase-item-caption span {
  display: block;
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: 4px;
}

@media (min-width: 768px) {
  .portfolio-showcase {
    padding: var(--section-padding-y) 24px;
  }
  .showcase-grid {
    gap: 64px;
  }
}

/* ============ MOCKUP FRAMES ============ */

/* Desktop browser frame */
.mockup-desktop {
  width: 100%;
  max-width: 700px;
  background: var(--color-bg-card);
  border-radius: 12px 12px 8px 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  transition: transform 400ms var(--ease-out-expo), box-shadow 400ms var(--ease-out-expo);
}
.mockup-desktop:hover {
  transform: translateY(-6px);
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 229, 255, 0.1);
}
.mockup-desktop-bar {
  height: 32px;
  background: #1a2744;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
}
.mockup-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.mockup-dot-red { background: #FF5F57; }
.mockup-dot-yellow { background: #FFBD2E; }
.mockup-dot-green { background: #27C93F; }
.mockup-desktop img {
  width: 100%;
  display: block;
  border-radius: 0 0 8px 8px;
}

/* Mobile phone frame */
.mockup-mobile {
  width: 140px;
  flex-shrink: 0;
  background: var(--color-bg-card);
  border: 3px solid #1a2744;
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  position: relative;
  transition: transform 400ms var(--ease-out-expo), box-shadow 400ms var(--ease-out-expo);
}
.mockup-mobile:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 229, 255, 0.1);
}
.mockup-mobile::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 16px;
  background: #1a2744;
  border-radius: 10px;
  z-index: 2;
}
.mockup-mobile img {
  width: 100%;
  display: block;
  border-radius: 20px;
}

@media (min-width: 768px) {
  .mockup-mobile {
    width: 200px;
  }
  .mockup-mobile::before {
    width: 80px;
    height: 20px;
    top: 10px;
  }
}
@media (min-width: 1024px) {
  .mockup-mobile {
    width: 280px;
  }
}

/* Demo button */
.demo-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid rgba(0, 229, 255, 0.4);
  padding: 10px 20px;
  border-radius: 50px;
  transition: background 200ms var(--ease-out-expo), border-color 200ms var(--ease-out-expo), transform 200ms var(--ease-out-expo);
  margin-top: 12px;
}
.demo-btn:hover {
  background: rgba(0, 229, 255, 0.08);
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

/* ============ WHAT'S INCLUDED ============ */
.included-section {
  background: var(--color-bg-deep);
  padding: var(--section-padding-y-mobile) 20px;
  position: relative;
}
.included-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-width: 1100px;
  margin: 48px auto 0;
  text-align: left;
}
.included-item {
  background: rgba(12, 30, 58, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 229, 255, 0.08);
  border-radius: 20px;
  padding: 28px 24px;
  transition: transform 400ms var(--ease-out-expo), border-color 400ms var(--ease-out-expo), box-shadow 400ms var(--ease-out-expo);
}
.included-item:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 229, 255, 0.2);
  box-shadow: 0 12px 40px rgba(0, 229, 255, 0.08);
}
.included-item .item-icon {
  font-size: 36px;
  margin-bottom: 14px;
  display: block;
  filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.2));
}
.included-item h4 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}
.included-item p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

@media (min-width: 768px) {
  .included-section {
    padding: var(--section-padding-y) 24px;
  }
  .included-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}
@media (min-width: 1024px) {
  .included-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* ============ PROCESS SECTION ============ */
.process-section {
  background: var(--color-bg-mid);
  padding: var(--section-padding-y-mobile) 20px;
  position: relative;
}

/* Vertical timeline (mobile-first) */
.process-steps {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 500px;
  margin: 48px auto 0;
  position: relative;
  padding-left: 40px;
}
/* Vertical connector line */
.process-steps::before {
  content: '';
  position: absolute;
  top: 24px;
  bottom: 24px;
  left: 19px;
  width: 2px;
  border-left: 2px dashed rgba(0, 229, 255, 0.3);
}
.process-step {
  position: relative;
  padding: 16px 0 32px;
}
.process-step:last-child {
  padding-bottom: 0;
}
.process-step .step-num {
  position: absolute;
  left: -40px;
  top: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-bg-deep);
  border: 2px solid transparent;
  background-clip: padding-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  z-index: 1;
}
/* Gradient border trick */
.process-step .step-num::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  z-index: -1;
}
.process-step .step-num::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--color-bg-deep);
  z-index: -1;
}
.process-step h4 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 6px;
}
.process-step p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

/* Desktop: horizontal timeline */
@media (min-width: 768px) {
  .process-section {
    padding: var(--section-padding-y) 24px;
  }
  .process-steps {
    flex-direction: row;
    justify-content: space-between;
    max-width: 900px;
    padding-left: 0;
    gap: 16px;
  }
  /* Horizontal connector line */
  .process-steps::before {
    top: 20px;
    bottom: auto;
    left: 40px;
    right: 40px;
    width: auto;
    height: 2px;
    border-left: none;
    border-top: 2px dashed rgba(0, 229, 255, 0.3);
  }
  .process-step {
    flex: 1;
    text-align: center;
    padding: 0;
  }
  .process-step .step-num {
    position: relative;
    left: auto;
    top: auto;
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    font-size: 18px;
  }
}

/* ============ DETAIL PRICING ============ */
.detail-pricing {
  background: var(--color-bg-deep);
  padding: var(--section-padding-y-mobile) 20px;
  text-align: center;
  position: relative;
}
.detail-pricing .price-display {
  font-family: var(--font-display);
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}
.detail-pricing .price-note {
  font-size: 14px;
  color: var(--color-text-muted);
  margin-bottom: 32px;
}

@media (min-width: 768px) {
  .detail-pricing {
    padding: var(--section-padding-y) 24px;
  }
}

/* ============ DETAIL CTA ============ */
.detail-cta {
  background: var(--color-bg-deep);
  padding: var(--section-padding-y-mobile) 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.detail-cta::after {
  content: '';
  position: absolute;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 300px;
  background: radial-gradient(ellipse at center,
    rgba(0, 229, 255, 0.12) 0%,
    rgba(6, 214, 160, 0.06) 40%,
    transparent 70%);
  pointer-events: none;
}
.detail-cta .section-inner {
  position: relative;
  z-index: 1;
}
.detail-cta .motivation {
  font-size: 17px;
  color: var(--color-text-secondary);
  line-height: 1.75;
  max-width: 560px;
  margin: 0 auto 32px;
}

@media (min-width: 768px) {
  .detail-cta {
    padding: var(--section-padding-y) 24px;
  }
}

/* ============ SERVICE DETAIL LINK (on homepage cards) ============ */
.service-detail-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 12px;
  transition: gap 200ms var(--ease-out-expo), color 200ms var(--ease-out-expo);
}
.service-detail-link:hover {
  gap: 8px;
  color: var(--color-secondary);
}

/* ============ FAQ on detail pages (extend) ============ */
.detail-faq {
  background: var(--color-bg-mid);
  padding: var(--section-padding-y-mobile) 20px;
  position: relative;
}
@media (min-width: 768px) {
  .detail-faq {
    padding: var(--section-padding-y) 24px;
  }
}
```

---

## C. HTML Template — wedding-basic.html

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Wedding E-Invitation Basic · RM 500 · H2ODreamer Studio</title>
  <meta name="description" content="A beautifully designed digital wedding invitation — mobile-friendly, shareable via WhatsApp, ready in 3-5 days. From RM 500.">

  <!-- Open Graph -->
  <meta property="og:title" content="Wedding E-Invitation Basic — H2ODreamer Studio">
  <meta property="og:description" content="Your love deserves more than a group chat message. Digital wedding invitations from RM 500.">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:locale:alternate" content="en_US">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Wedding E-Invitation Basic — H2ODreamer Studio">
  <meta name="twitter:description" content="Your love deserves more than a group chat message.">

  <!-- Theme color -->
  <meta name="theme-color" content="#020818">

  <!-- Favicon -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💧</text></svg>">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap"></noscript>

  <link rel="stylesheet" href="css/style.min.css">

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-45NTTZBZC4"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-45NTTZBZC4');
  </script>
</head>
<body>

  <!-- ============ NAVBAR (reused from homepage) ============ -->
  <nav class="navbar" id="navbar">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">H2O<span>Dreamer</span> Studio</a>

      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>

      <ul class="nav-links" id="navLinks">
        <li><a href="index.html#story" data-lang-en="Why Us" data-lang-cn="为什么选我们">Why Us</a></li>
        <li><a href="index.html#services" data-lang-en="Services" data-lang-cn="服务">Services</a></li>
        <li><a href="index.html#portfolio" data-lang-en="Portfolio" data-lang-cn="作品集">Portfolio</a></li>
        <li><a href="index.html#faq" data-lang-en="FAQ" data-lang-cn="常见问题">FAQ</a></li>
        <li><a href="index.html#contact" data-lang-en="Contact" data-lang-cn="联系">Contact</a></li>
      </ul>

      <button class="lang-toggle" id="langToggle" aria-label="Toggle language">
        <span class="lang-en">EN</span> / <span class="lang-cn">中文</span>
      </button>
    </div>
  </nav>

  <main>

    <!-- ============ DETAIL HERO ============ -->
    <section class="detail-hero" id="hero">
      <div class="hero-bg-glow"></div>
      <a href="index.html#services" class="back-link"
         data-lang-en="← Back to Services"
         data-lang-cn="← 返回服务列表">← Back to Services</a>
      <div class="hero-inner">
        <div class="hero-badge"
             data-lang-en="Basic · Wedding E-Invitation"
             data-lang-cn="基础版 · 电子喜帖">Basic · Wedding E-Invitation</div>
        <h1 data-lang-en="Your Love Deserves More Than a Group Chat Message"
            data-lang-cn="你们的爱情，值得比群发消息更美的开始">
          你们的爱情，值得比群发消息更美的开始
        </h1>
        <p class="hero-sub"
           data-lang-en="A beautifully designed digital invitation that tells your story, guides your guests, and makes sharing as easy as sending a WhatsApp link. Ready in just 3-5 days."
           data-lang-cn="一张精心设计的电子喜帖，讲述你们的故事，引导宾客出席，分享只需一个 WhatsApp 链接。3-5 天即可完成。">
          一张精心设计的电子喜帖，讲述你们的故事，引导宾客出席，分享只需一个 WhatsApp 链接。3-5 天即可完成。
        </p>
        <a href="https://wa.me/60166897835?text=Hi%20H2ODreamer!%20I'm%20interested%20in%20the%20Basic%20Wedding%20E-Invitation%20(RM%20500).%20My%20wedding%20date%20is%20%5Bdate%5D."
           class="btn-primary" target="_blank" rel="noopener"
           data-lang-en="💬 Get My E-Invite — RM 500"
           data-lang-cn="💬 获取我的电子喜帖 — RM 500">
          💬 获取我的电子喜帖 — RM 500
        </a>
        <p class="hero-price"
           data-lang-en="Usually replies within 1 hour"
           data-lang-cn="通常在 1 小时内回复">通常在 1 小时内回复</p>
      </div>
    </section>

    <!-- ============ WAVE DIVIDER ============ -->
    <div class="wave-divider wave-2-over" aria-hidden="true">
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0,0 L0,40 C240,80 480,20 720,50 C960,80 1200,25 1440,45 L1440,0Z" fill="var(--color-bg-mid)"/></svg>
    </div>

    <!-- ============ PORTFOLIO SHOWCASE ============ -->
    <section class="portfolio-showcase" id="showcase">
      <div class="section-inner">
        <div class="section-label"
             data-lang-en="See It in Action"
             data-lang-cn="看看实际效果">看看实际效果</div>
        <h2 class="section-title"
            data-lang-en="See It in <em>Action</em>"
            data-lang-cn="看看<em>实际效果</em>">
          看看<em>实际效果</em>
        </h2>
        <p class="section-body"
           data-lang-en="Every couple's style is different. Here are two directions we can customize for you."
           data-lang-cn="每对新人的风格都不同。以下是我们可以为你定制的两种方向。">
          每对新人的风格都不同。以下是我们可以为你定制的两种方向。
        </p>

        <div class="showcase-grid">

          <!-- Demo 1: Elegant Minimal -->
          <div class="showcase-item reveal reveal-up">
            <div class="showcase-item-frames">
              <div class="mockup-desktop">
                <div class="mockup-desktop-bar">
                  <span class="mockup-dot mockup-dot-red"></span>
                  <span class="mockup-dot mockup-dot-yellow"></span>
                  <span class="mockup-dot mockup-dot-green"></span>
                </div>
                <img src="assets/portfolio/wedding-basic-elegant-desktop.webp"
                     alt="Elegant Minimal wedding invitation - desktop view"
                     loading="lazy" width="700" height="440">
              </div>
              <div class="mockup-mobile">
                <img src="assets/portfolio/wedding-basic-elegant-mobile.webp"
                     alt="Elegant Minimal wedding invitation - mobile view"
                     loading="lazy" width="280" height="560">
              </div>
            </div>
            <div class="showcase-item-caption">
              <span data-lang-en="Elegant Minimal Style" data-lang-cn="优雅极简风格">优雅极简风格</span>
              <a href="demos/wedding-basic-elegant.html" class="demo-btn" target="_blank" rel="noopener"
                 data-lang-en="View Live Demo →" data-lang-cn="查看在线演示 →">
                查看在线演示 →
              </a>
            </div>
          </div>

          <!-- Demo 2: Modern Minimalist -->
          <div class="showcase-item reveal reveal-up">
            <div class="showcase-item-frames">
              <div class="mockup-desktop">
                <div class="mockup-desktop-bar">
                  <span class="mockup-dot mockup-dot-red"></span>
                  <span class="mockup-dot mockup-dot-yellow"></span>
                  <span class="mockup-dot mockup-dot-green"></span>
                </div>
                <img src="assets/portfolio/wedding-basic-modern-desktop.webp"
                     alt="Modern Minimalist wedding invitation - desktop view"
                     loading="lazy" width="700" height="440">
              </div>
              <div class="mockup-mobile">
                <img src="assets/portfolio/wedding-basic-modern-mobile.webp"
                     alt="Modern Minimalist wedding invitation - mobile view"
                     loading="lazy" width="280" height="560">
              </div>
            </div>
            <div class="showcase-item-caption">
              <span data-lang-en="Modern Minimalist Style" data-lang-cn="现代简约风格">现代简约风格</span>
              <a href="demos/wedding-basic-modern.html" class="demo-btn" target="_blank" rel="noopener"
                 data-lang-en="View Live Demo →" data-lang-cn="查看在线演示 →">
                查看在线演示 →
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ============ WAVE DIVIDER ============ -->
    <div class="wave-divider wave-4" aria-hidden="true">
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0,30 C320,70 640,0 960,50 C1120,65 1300,20 1440,40 L1440,80 L0,80Z"/></svg>
    </div>

    <!-- ============ WHAT'S INCLUDED ============ -->
    <section class="included-section" id="included">
      <div class="section-inner">
        <div class="section-label"
             data-lang-en="What's Included"
             data-lang-cn="包含内容">包含内容</div>
        <h2 class="section-title"
            data-lang-en="Everything You <em>Need</em>"
            data-lang-cn="你需要的<em>一切</em>">
          你需要的<em>一切</em>
        </h2>

        <div class="included-grid">

          <div class="included-item reveal reveal-up">
            <span class="item-icon">🎨</span>
            <h4 data-lang-en="Single-Page Template Customization"
                data-lang-cn="单页模板定制">单页模板定制</h4>
            <p data-lang-en="A clean one-page design tailored to your wedding theme and color preferences."
               data-lang-cn="简洁的单页设计，依据你的婚礼主题和色调偏好量身打造。">
              简洁的单页设计，依据你的婚礼主题和色调偏好量身打造。
            </p>
          </div>

          <div class="included-item reveal reveal-up">
            <span class="item-icon">📱</span>
            <h4 data-lang-en="Mobile-Friendly Design"
                data-lang-cn="手机友好设计">手机友好设计</h4>
            <p data-lang-en="Looks perfect on any phone — because 90% of your guests will open it on mobile."
               data-lang-cn="任何手机打开都完美呈现 — 因为 90% 的宾客都用手机查看。">
              任何手机打开都完美呈现 — 因为 90% 的宾客都用手机查看。
            </p>
          </div>

          <div class="included-item reveal reveal-up">
            <span class="item-icon">📍</span>
            <h4 data-lang-en="Date, Venue & Google Maps"
                data-lang-cn="日期、地点 & Google Maps 导航">日期、地点 & Google Maps 导航</h4>
            <p data-lang-en="All the key details in one place, with a tap-to-navigate map so no one gets lost."
               data-lang-cn="所有关键信息集中在一处，点一下地图就能导航，宾客不怕迷路。">
              所有关键信息集中在一处，点一下地图就能导航，宾客不怕迷路。
            </p>
          </div>

          <div class="included-item reveal reveal-up">
            <span class="item-icon">🎞</span>
            <h4 data-lang-en="Custom Colors & Photos"
                data-lang-cn="专属配色 & 照片">专属配色 & 照片</h4>
            <p data-lang-en="Your photos, your palette — we match the design to your wedding aesthetic."
               data-lang-cn="用你的照片、你的色调 — 设计完全配合你的婚礼美学。">
              用你的照片、你的色调 — 设计完全配合你的婚礼美学。
            </p>
          </div>

          <div class="included-item reveal reveal-up">
            <span class="item-icon">🔗</span>
            <h4 data-lang-en="Shareable Link"
                data-lang-cn="可分享链接">可分享链接</h4>
            <p data-lang-en="One link, share anywhere — WhatsApp, Instagram, WeChat, or SMS."
               data-lang-cn="一个链接，随处分享 — WhatsApp、Instagram、微信或短信都行。">
              一个链接，随处分享 — WhatsApp、Instagram、微信或短信都行。
            </p>
          </div>

          <div class="included-item reveal reveal-up">
            <span class="item-icon">🔍</span>
            <h4 data-lang-en="Basic SEO Meta Tags"
                data-lang-cn="基础 SEO 标签">基础 SEO 标签</h4>
            <p data-lang-en="Proper titles and descriptions so the link preview looks polished when shared."
               data-lang-cn="正确的标题和描述，让分享时的链接预览看起来精致专业。">
              正确的标题和描述，让分享时的链接预览看起来精致专业。
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- ============ WAVE DIVIDER ============ -->
    <div class="wave-divider wave-3" aria-hidden="true">
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0,50 C180,10 360,70 540,30 C720,0 900,60 1080,25 C1260,0 1380,45 1440,30 L1440,80 L0,80Z"/></svg>
    </div>

    <!-- ============ PROCESS STEPS ============ -->
    <section class="process-section" id="process">
      <div class="section-inner">
        <div class="section-label"
             data-lang-en="How It Works"
             data-lang-cn="制作流程">制作流程</div>
        <h2 class="section-title"
            data-lang-en="From <em>Idea</em> to <em>Inbox</em>"
            data-lang-cn="从<em>想法</em>到<em>收件箱</em>">
          从<em>想法</em>到<em>收件箱</em>
        </h2>

        <div class="process-steps">

          <div class="process-step reveal reveal-up">
            <div class="step-num">1</div>
            <h4 data-lang-en="Consult" data-lang-cn="咨询">咨询</h4>
            <p data-lang-en="Tell us about your wedding — date, venue, theme, and any must-haves. We'll suggest a design direction."
               data-lang-cn="告诉我们你的婚礼细节 — 日期、地点、主题和必须包含的元素。我们会建议设计方向。">
              告诉我们你的婚礼细节 — 日期、地点、主题和必须包含的元素。我们会建议设计方向。
            </p>
          </div>

          <div class="process-step reveal reveal-up">
            <div class="step-num">2</div>
            <h4 data-lang-en="Customize" data-lang-cn="定制">定制</h4>
            <p data-lang-en="We build your e-invitation based on the chosen template, adding your photos, colors, and details."
               data-lang-cn="根据选定的模板，加入你的照片、配色和细节，打造专属喜帖。">
              根据选定的模板，加入你的照片、配色和细节，打造专属喜帖。
            </p>
          </div>

          <div class="process-step reveal reveal-up">
            <div class="step-num">3</div>
            <h4 data-lang-en="Review" data-lang-cn="审查">审查</h4>
            <p data-lang-en="You get a preview link to check everything. One round of revisions included."
               data-lang-cn="你会收到预览链接检查所有内容。包含一轮修改。">
              你会收到预览链接检查所有内容。包含一轮修改。
            </p>
          </div>

          <div class="process-step reveal reveal-up">
            <div class="step-num">4</div>
            <h4 data-lang-en="Deliver" data-lang-cn="交付">交付</h4>
            <p data-lang-en="Your e-invitation goes live with a shareable link, ready to send to all your guests. Total: 3-5 days."
               data-lang-cn="你的电子喜帖上线，附带可分享链接，随时发送给所有宾客。全程：3-5 天。">
              你的电子喜帖上线，附带可分享链接，随时发送给所有宾客。全程：3-5 天。
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- ============ WAVE DIVIDER ============ -->
    <div class="wave-divider wave-4" aria-hidden="true">
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0,30 C320,70 640,0 960,50 C1120,65 1300,20 1440,40 L1440,80 L0,80Z"/></svg>
    </div>

    <!-- ============ FAQ ============ -->
    <section class="detail-faq" id="faq">
      <div class="section-inner">
        <div class="section-label"
             data-lang-en="Questions"
             data-lang-cn="常见问题">常见问题</div>
        <h2 class="section-title"
            data-lang-en="Got questions?<br>We've got answers."
            data-lang-cn="你想知道的，<br>我们都为你准备好了。">
          你想知道的，<br>我们都为你准备好了。
        </h2>
        <div class="faq-list">

          <details class="faq-item" open>
            <summary>
              <span data-lang-en="Can I add more photos later?"
                    data-lang-cn="之后可以加更多照片吗？">之后可以加更多照片吗？</span>
              <span class="faq-chevron">+</span>
            </summary>
            <div class="faq-answer"
                 data-lang-en="Yes, you can request to swap photos within the revision round. After delivery, minor updates (like changing a photo) can be arranged for a small fee."
                 data-lang-cn="可以，你可以在修改轮次中要求更换照片。交付后，小幅更新（如更换照片）可另外安排，收取少许费用。">
              可以，你可以在修改轮次中要求更换照片。交付后，小幅更新（如更换照片）可另外安排，收取少许费用。
            </div>
          </details>

          <details class="faq-item">
            <summary>
              <span data-lang-en="Do my guests need to download an app?"
                    data-lang-cn="宾客需要下载 app 吗？">宾客需要下载 app 吗？</span>
              <span class="faq-chevron">+</span>
            </summary>
            <div class="faq-answer"
                 data-lang-en="No. It's a web link — guests just tap and view. Works on any phone, tablet, or computer."
                 data-lang-cn="不需要。这是一个网页链接 — 点击即可查看。手机、平板、电脑都能打开。">
              不需要。这是一个网页链接 — 点击即可查看。手机、平板、电脑都能打开。
            </div>
          </details>

          <details class="faq-item">
            <summary>
              <span data-lang-en="Can I send it through WhatsApp?"
                    data-lang-cn="可以通过 WhatsApp 发送吗？">可以通过 WhatsApp 发送吗？</span>
              <span class="faq-chevron">+</span>
            </summary>
            <div class="faq-answer"
                 data-lang-en="Absolutely. That's how most Malaysian couples share it. Just copy the link and send — the preview will show your wedding details beautifully."
                 data-lang-cn="当然可以。大部分马来西亚新人都这样分享。复制链接发送即可 — 预览会精美地显示你的婚礼信息。">
              当然可以。大部分马来西亚新人都这样分享。复制链接发送即可 — 预览会精美地显示你的婚礼信息。
            </div>
          </details>

          <details class="faq-item">
            <summary>
              <span data-lang-en="What if I need it urgently?"
                    data-lang-cn="如果急需怎么办？">如果急需怎么办？</span>
              <span class="faq-chevron">+</span>
            </summary>
            <div class="faq-answer"
                 data-lang-en="We can do rush delivery in 2 days for an additional RM 150. Just let us know when you reach out."
                 data-lang-cn="我们可以加急 2 天交付，额外收费 RM 150。联系我们时告知即可。">
              我们可以加急 2 天交付，额外收费 RM 150。联系我们时告知即可。
            </div>
          </details>

        </div>
      </div>
    </section>

    <!-- ============ WAVE DIVIDER ============ -->
    <div class="wave-divider wave-6-over" aria-hidden="true">
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0,0 L0,35 C360,70 720,10 1080,50 C1260,65 1380,30 1440,40 L1440,0Z" fill="var(--color-bg-mid)"/></svg>
    </div>

    <!-- ============ FINAL CTA ============ -->
    <section class="detail-cta" id="cta">
      <div class="section-inner">
        <h2 class="section-title"
            data-lang-en="Ready to make the <em>announcement</em>?"
            data-lang-cn="准备好发出这份<em>宣告</em>了吗？">
          准备好发出这份<em>宣告</em>了吗？
        </h2>
        <p class="motivation"
           data-lang-en="Your guests are waiting for the good news. Let's make the announcement unforgettable."
           data-lang-cn="你的宾客都在等好消息。让我们把这个宣布变得难忘。">
          你的宾客都在等好消息。让我们把这个宣布变得难忘。
        </p>
        <div class="contact-buttons">
          <a href="https://wa.me/60166897835?text=Hi%20H2ODreamer!%20I'd%20like%20to%20start%20my%20Basic%20Wedding%20E-Invitation%20(RM%20500).%20My%20wedding%20date%20is%20%5Bdate%5D."
             class="btn-wa" target="_blank" rel="noopener"
             data-lang-en="💬 WhatsApp Us — Start My E-Invite"
             data-lang-cn="💬 WhatsApp 咨询 — 开始制作喜帖">
            💬 WhatsApp 咨询 — 开始制作喜帖
          </a>
          <a href="mailto:ahshuang1994@gmail.com" class="btn-email"
             data-lang-en="📧 Email Us"
             data-lang-cn="📧 发送邮件">
            📧 发送邮件
          </a>
        </div>
      </div>
    </section>

  </main>

  <!-- ============ FOOTER (reused from homepage) ============ -->
  <footer class="footer">
    <div class="footer-inner">
      <p>&copy; 2026 H2ODreamer Studio &middot; Malaysia</p>
      <a href="#"
         data-lang-en="Privacy Policy"
         data-lang-cn="隐私政策">隐私政策</a>
    </div>
  </footer>

  <script src="js/main.min.js" defer></script>
</body>
</html>
```
