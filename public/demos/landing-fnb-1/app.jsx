const { useEffect, useState } = React;

const HERO_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuDi7Vk3tWy-ULLeJapXn3HA0zNFg-Cwf43nOfxJqLrOB4oyxBWVVDmd88aMb46zMDnNVsPaGQrVirK4WzJXCDZFHYJeJTQrjQcXeLrL8a_WqCwHLyBv86pQtEA-HnAUbFVxgkWBMeInzq6VhwRNk3Ae1E8oiDEZmoh1I-MgdOYd_LZ1_18kT-9JuTxK6oU9nDzUZJnhhvT-v5_QP91hcRBOvQi9eLeVA6icIpZIg2V1K2ok4sIbFzWjlNUf25wGX1_bLiLwNSDoOhXK";

const DISHES = [
  {
    name: "Nasi Lemak Wagyu",
    desc: "Pandan-coconut rice, A4 wagyu rendang, crispy anchovies, sambal hijau, soft-boiled egg.",
    price: 38,
    tag: "Signature",
    label: "/// hero plate · top-down",
    palette: ["#F4B96A", "#C25A22", "#3A1208"],
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCJvhRXOv1sDFk6u4b0Vr5oAFwfshBZ45MARp-r3F_ocx0cFETiIETo6i0xdKIMEqFsWTcRmX7KViteUz7wJjhY4-Lb3KpcY8bM8LSNMFq3Ydcvi8RNU8sq89I2JC-I7dmHGLgw_Xh87tgsrv31ZAX6KLJTL2YNwS8TGQTt5kvE0cEmRrt8vJIdI7TxepUfWelqZjOT0k2tVTmdXvgfbaLSYIQbxA_wZR9yHIKfU9Hzd2o5l0PYwilUgGBZ9JN4XDqgNJRK8xYWY3nr",
  },
  {
    name: "Rendang Lamb Shank",
    desc: "Slow-braised 8 hours in toasted kerisik and rempah. Falls off the bone.",
    price: 55,
    tag: "Chef's pick",
    label: "/// braised, side angle",
    palette: ["#D4751F", "#6E1F0A", "#2A0A05"],
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDubANG57aKNapM_3qtNc1aD5SuDbbZff6rEPLy0WipM7SG1Tt55XbgC01zNm1QDmRGD5z8dXj0GXCj55WwBKXWUUzUGMUfbzGzUdCZKDmQTmy08Z1hHegmHyWsrpt_hcoPccBrKoojhAhdciUyrll5ngvildephzCoyVAOspA4RJaWWdtlP7Uyv23m6JV0ruXJysiW8dqQARj9gv3ZaTNK1jDQHhOYpZ4xVlhbivo_H7fYgcPU-o9rJiZzeZIVd8ikxtzSD6dvgqFL",
  },
  {
    name: "Charcoal Satay Platter",
    desc: "Wagyu, chicken thigh, lamb. Smoked over Bintulu charcoal, peanut sauce, ketupat.",
    price: 42,
    tag: "Sharing",
    label: "/// skewers, low light",
    palette: ["#8C4A1E", "#3B1A0B", "#1A0A05"],
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAOQ3IRpQ1Ol-QwYRIYlOcsyE4zTJ5cVIG-HjRT5aUwtFyyy_4TT8ivG8FbTWKkYFpIm7VzO2VUyHaF4wUwQwlY-4v570GVGYq2R1nS0QGOWC68m42xWcIc7pHrI32guRK92A7FfQsWsu5KDYYXHHm-RuqZNgn86v-19vRIwZGy0u-cG-bw0-9G62nafgUU8Q9s8rVtPxXX3RplPhOHa2lSslBK7PARDf1a7ielxdAGhUJtm-wkyciCzGhhiFu2XWaa403Ir_edYW7b",
  },
  {
    name: "Pandan Crème Brûlée",
    desc: "Single-origin pandan custard, gula melaka caramel, toasted coconut crisp.",
    price: 22,
    tag: "Dessert",
    label: "/// cracked sugar top",
    palette: ["#E8D27A", "#7A8C3A", "#1E2A14"],
  },
];

const REVIEWS = [
  {
    text: "The rendang lamb shank is the best modern Malaysian dish I've had in KL — full stop. Every detail is considered.",
    name: "Aisyah R.",
    detail: "Mont Kiara · Dined Apr 2026",
    stars: 5,
    avatar: "#E85D2C",
  },
  {
    text: "Brought clients here for dinner. The room is moody and grown-up, the satay platter stole the show. We're regulars now.",
    name: "Jonathan T.",
    detail: "KLCC · Dined Mar 2026",
    stars: 5,
    avatar: "#D4A84B",
  },
  {
    text: "That pandan brûlée. The crack of the caramel and the gula melaka underneath — I genuinely thought about it the next morning.",
    name: "Priya M.",
    detail: "TTDI · Dined Apr 2026",
    stars: 5,
    avatar: "#2E6F4F",
  },
];

const HOURS = [
  { day: "Mon", time: "Closed", open: false, closed: true },
  { day: "Tue", time: "11:30 – 22:00", open: false },
  { day: "Wed", time: "11:30 – 22:00", open: false },
  { day: "Thu", time: "11:30 – 22:00", open: false },
  { day: "Fri", time: "11:30 – 22:00", open: false },
  { day: "Sat", time: "11:30 – 22:00", open: false },
  { day: "Sun", time: "11:30 – 22:00", open: false },
];

function todayKey() {
  const idx = new Date().getDay(); // 0=Sun
  const map = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return map[idx];
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollTo
      ? null
      : document.getElementById(id)?.getBoundingClientRect();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
  };

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <a href="#top" className="brand" onClick={goTo("top")}>
        <span className="brand-mark"><Icon.Flame size={15} /></span>
        Wok &amp; Flame
      </a>
      <div className="nav-links">
        <a href="#menu" onClick={goTo("menu")}>Menu</a>
        <a href="#story" onClick={goTo("story")}>Story</a>
        <a href="#reviews" onClick={goTo("reviews")}>Reviews</a>
        <a href="#visit" onClick={goTo("visit")}>Visit</a>
      </div>
      <a href="#visit" className="nav-cta" onClick={goTo("visit")}>
        <span className="nav-cta-label">Reserve</span>
        <Icon.Arrow size={14} />
      </a>
    </nav>
  );
}

function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-bg">
        <img className="hero-bg-img" src={HERO_IMG} alt="Wok & Flame hero" />
      </div>
      <div className="hero-vignette" />

      <div className="hero-meta">
        <span>Bangsar · Kuala Lumpur</span>
        <span className="dot" />
        <span>Est. 2024</span>
        <span className="dot" />
        <span>Halal · Reservations open</span>
      </div>

      <h1 className="hero-title">
        Wok <span className="amp">&amp;</span> Flame
      </h1>

      <p className="hero-tagline">
        Modern Malaysian flavours, <strong>crafted with fire.</strong> A small kitchen in Bangsar cooking the food we grew up with — sharper, slower, and built around the grill.
      </p>

      <div className="hero-cta-row">
        <a href="#menu" className="btn btn-primary" onClick={(e) => { e.preventDefault(); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
          View the menu <Icon.Arrow size={16} />
        </a>
        <a href="#visit" className="btn btn-ghost" onClick={(e) => { e.preventDefault(); document.getElementById("visit")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
          Book a table
        </a>
      </div>

      <div className="hero-strip">
        <div className="strip-item"><Icon.Pin /> 22 Jalan Telawi 3 · Bangsar Baru</div>
        <div className="strip-item"><Icon.Clock /> Tue – Sun · 11:30 – 22:00</div>
        <div className="strip-item"><Icon.Phone /> +60 3-2284 5577</div>
        <div className="strip-item">★ 4.9 on Google · 412 reviews</div>
      </div>
    </header>
  );
}

function About() {
  return (
    <section className="section about" id="story">
      <Reveal className="about-side">
        <span className="section-eyebrow">Our story</span>
        <h2 className="section-title">A neighbourhood kitchen <em>built around the grill.</em></h2>
      </Reveal>
      <Reveal className="about-body" delay={120}>
        <p>
          Wok &amp; Flame started as a series of Sunday suppers in a Bangsar shophouse. Chef Aiman cooked the food his grandmother taught him — rendang, sambal, satay — but on a grill hot enough to coax char from a fingerling banana, smoke from a charred coconut husk.
        </p>
        <p>
          Two years on, the suppers have a permanent room. The rempah is still pounded by hand each morning. The grill still runs on Bintulu charcoal. We source heritage chillies from a co-op in Cameron Highlands, and our coconut milk is pressed the same day it lands in the kitchen.
        </p>
        <p>
          It's the food we grew up with — sharper, slower, and uncompromising about heat.
        </p>
        <div className="about-stats">
          <div>
            <div className="stat-num">14</div>
            <div className="stat-label">Hours of daily prep</div>
          </div>
          <div>
            <div className="stat-num">8</div>
            <div className="stat-label">Small-farm suppliers</div>
          </div>
          <div>
            <div className="stat-num">1,200°</div>
            <div className="stat-label">Grill temperature, °F</div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Dishes() {
  return (
    <section className="section" id="menu">
      <div className="dishes-header">
        <Reveal>
          <span className="section-eyebrow">Signature plates</span>
          <h2 className="section-title">A small menu, <em>cooked properly.</em></h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="section-lede">
            Twelve dishes on the menu at any time. These four anchor it — and they're the reason most guests come back.
          </p>
        </Reveal>
      </div>

      <div className="dishes-grid">
        {DISHES.map((d, i) => (
          <Reveal key={d.name} delay={i * 80} className="dish-card-wrap" as="div">
            <article className="dish-card">
              <DishPlaceholder palette={d.palette} label={d.label} img={d.img} name={d.name} />
              <span className="dish-tag">{d.tag}</span>
              <div className="dish-body">
                <h3 className="dish-name">{d.name}</h3>
                <p className="dish-desc">{d.desc}</p>
                <div className="dish-foot">
                  <div className="dish-price"><span className="rm">RM</span>{d.price}</div>
                  <button className="dish-add" aria-label={`Add ${d.name}`}><Icon.Plus /></button>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <div className="testimonials-wrap" id="reviews">
      <section className="section" style={{ paddingTop: "clamp(72px, 9vw, 120px)", paddingBottom: "clamp(72px, 9vw, 120px)" }}>
        <Reveal>
          <span className="section-eyebrow">What guests say</span>
          <h2 className="section-title">412 reviews. <em>4.9 stars.</em></h2>
        </Reveal>
        <div className="testimonials-grid">
          {REVIEWS.map((r, i) => (
            <Reveal key={r.name} delay={i * 100} as="article" className="review">
              <Stars count={r.stars} />
              <p className="review-text">"{r.text}"</p>
              <div className="review-author">
                <div className="author-avatar" style={{ background: r.avatar }}>
                  {r.name.split(" ").map((s) => s[0]).join("")}
                </div>
                <div className="author-meta">
                  <span className="author-name">{r.name}</span>
                  <span className="author-detail">{r.detail}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

function Location() {
  const today = todayKey();
  return (
    <section className="section" id="visit">
      <Reveal>
        <span className="section-eyebrow">Find us</span>
        <h2 className="section-title">22 Jalan Telawi 3, <em>Bangsar Baru.</em></h2>
        <p className="section-lede">Two doors down from the old bakery, just off Jalan Telawi. Valet at the corner; LRT Bangsar is a six-minute walk.</p>
      </Reveal>

      <div className="location-grid">
        <Reveal as="div" className="info-card" delay={80}>
          <div className="info-row">
            <div className="info-icon"><Icon.Pin size={18} /></div>
            <div>
              <div className="info-label">Address</div>
              <div className="info-value">
                <strong>Wok &amp; Flame</strong><br/>
                22 Jalan Telawi 3<br/>
                Bangsar Baru, 59100 Kuala Lumpur
              </div>
            </div>
          </div>

          <div className="info-row">
            <div className="info-icon"><Icon.Clock size={18} /></div>
            <div style={{ flex: 1 }}>
              <div className="info-label">Hours</div>
              <div className="hours-list">
                {HOURS.map((h) => (
                  <div key={h.day} className={`hours-row ${h.day === today && !h.closed ? "open" : ""}`}>
                    <span className={`day ${h.closed ? "closed" : ""}`}>{h.day}</span>
                    <span className={`time ${h.closed ? "closed" : ""}`}>{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="info-row">
            <div className="info-icon"><Icon.Phone size={18} /></div>
            <div>
              <div className="info-label">Reservations</div>
              <div className="info-value">
                <strong>+60 3-2284 5577</strong><br/>
                <span style={{ color: "var(--ink-dim)", fontSize: 14 }}>Or message us on WhatsApp — usually a reply within 10 minutes.</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal as="div" className="map-card" delay={160}>
          <MapPlaceholder />
          <div className="map-pin-wrap">
            <div style={{ position: "relative" }}>
              <div className="map-pin-pulse" />
              <div className="map-pin" />
            </div>
            <div className="map-label">Wok &amp; Flame</div>
          </div>
          <a className="map-open-btn" href="https://maps.google.com/?q=22+Jalan+Telawi+3+Bangsar" target="_blank" rel="noopener noreferrer">
            Open in Maps <Icon.External size={12} />
          </a>
          <span className="map-overlay-tag">/// MAP EMBED · Google Maps iframe</span>
        </Reveal>
      </div>
    </section>
  );
}

function MapPlaceholder() {
  // Stylized dark map placeholder — abstract grid suggesting Bangsar's street layout
  return (
    <svg className="map-svg" viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(245,239,230,0.04)" strokeWidth="1"/>
        </pattern>
        <radialGradient id="map-glow" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stopColor="rgba(232,93,44, 0.18)" />
          <stop offset="100%" stopColor="rgba(232,93,44, 0)" />
        </radialGradient>
      </defs>
      <rect width="600" height="460" fill="#181818" />
      <rect width="600" height="460" fill="url(#map-grid)" />
      <rect width="600" height="460" fill="url(#map-glow)" />

      {/* "Streets" */}
      <g stroke="rgba(245,239,230,0.10)" strokeWidth="2" fill="none">
        <path d="M -20 120 Q 200 140 620 110" />
        <path d="M -20 250 Q 300 270 620 240" />
        <path d="M -20 360 Q 280 340 620 380" />
        <path d="M 120 -20 Q 140 200 110 480" />
        <path d="M 360 -20 Q 380 240 350 480" />
      </g>
      {/* primary street through pin */}
      <path d="M -20 230 Q 300 230 620 230" stroke="rgba(212, 168, 75, 0.35)" strokeWidth="2.5" fill="none" />
      <text x="20" y="222" fill="rgba(212,168,75, 0.55)" fontSize="10" fontFamily="JetBrains Mono, monospace" letterSpacing="2">JLN TELAWI 3</text>

      {/* "blocks" */}
      <g fill="rgba(245,239,230,0.025)">
        <rect x="60" y="140" width="200" height="80" rx="4" />
        <rect x="280" y="140" width="160" height="80" rx="4" />
        <rect x="60" y="260" width="180" height="80" rx="4" />
        <rect x="260" y="260" width="200" height="80" rx="4" />
        <rect x="480" y="140" width="100" height="80" rx="4" />
        <rect x="480" y="260" width="100" height="80" rx="4" />
      </g>
    </svg>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="brand">
            <span className="brand-mark"><Icon.Flame size={15} /></span>
            Wok &amp; Flame
          </div>
          <p>Modern Malaysian, cooked with fire. A neighbourhood kitchen in Bangsar Baru.</p>
          <div className="footer-socials">
            <a className="footer-social" href="#" aria-label="Instagram"><Icon.Instagram /></a>
            <a className="footer-social" href="#" aria-label="Facebook"><Icon.Facebook /></a>
            <a className="footer-social" href="#" aria-label="TikTok"><Icon.Tiktok /></a>
          </div>
        </div>
        <div className="footer-col">
          <h4>Menu</h4>
          <ul>
            <li><a href="#menu">Signatures</a></li>
            <li><a href="#menu">Tasting menu</a></li>
            <li><a href="#menu">Drinks &amp; wine</a></li>
            <li><a href="#menu">Private dining</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Visit</h4>
          <ul>
            <li><a href="#visit">Bangsar</a></li>
            <li><a href="#visit">Hours</a></li>
            <li><a href="#visit">Reservations</a></li>
            <li><a href="#visit">Directions</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#story">Our story</a></li>
            <li><a href="#">Press</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Gift cards</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-base">
        <span>© 2026 Wok &amp; Flame Sdn Bhd · Reg. 202301045678</span>
        <span>Bangsar · Kuala Lumpur</span>
      </div>
    </footer>
  );
}

function WhatsappFab() {
  return (
    <a
      className="wa-fab"
      href="https://wa.me/60322845577?text=Hi%20Wok%20%26%20Flame%2C%20I%27d%20like%20to%20book%20a%20table"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Book a table on WhatsApp"
    >
      <Icon.Whatsapp />
      <span className="wa-label">Book a Table</span>
    </a>
  );
}

function App() {
  return (
    <>
      <Nav />
      <Hero />
      <About />
      <Dishes />
      <Testimonials />
      <Location />
      <Footer />
      <WhatsappFab />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
