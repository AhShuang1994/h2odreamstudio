# BUILD —— 静态稿规范 → React + Tailwind 转换

## 前半:静态稿(阶段③)

**目的:让用户最快判断"像不像"。** 所以:

- **单文件 HTML**,`<style>` 内联,不拆外部 CSS
- **不做动效**、不做 hover 之外的交互
- **不拆组件**,重复的卡片就重复写
- **图片全用占位** —— 尺寸正确的色块 + 一行说明文字,别去找图

### `:root` 变量直接来自 DESIGN.md

token 有一处真相。DESIGN.md 里的 hex 和 px 原样搬进 `:root`,不要在 CSS 里又写一遍字面值:

```html
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #FDFCFB;
    --surface: #FFFFFF;
    --text: #2D2D2D;
    --text-2: #6B6B6B;
    --border: rgba(0,0,0,0.06);
    --accent: #E8919A;
    --radius-sm: 10px;
    --radius-md: 16px;
    --maxw: 1200px;
    --pad: clamp(20px, 4vw, 64px);
    --section-y: 96px;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }
</style>
```

参考 `h2odreamstudio/demos/glowseoul-skincare.html` 的写法 —— 同一套结构。

### 占位图的正确做法

```html
<div class="ph" style="aspect-ratio: 4/3">产品照 · 4:3</div>
```

```css
.ph {
  display: grid; place-items: center;
  background: repeating-linear-gradient(45deg, #EEE 0 10px, #E5E5E5 10px 20px);
  color: #999; font-size: 13px; border-radius: var(--radius-md);
}
```

**尺寸必须正确** —— 占位图的宽高比错了,整块布局都是错的,校验时会误判成间距问题。

---

## 后半:转 React + Tailwind CDN(阶段⑤)

用户确认静态稿之后才做。目标形态:**双击 `index.html` 就能跑,不用 npm install、不用 build。**

### 四个文件

```
index.html        CDN 引入 + tailwind.config + 挂载点
components.jsx    图标(内联 SVG)+ 可复用小件
app.jsx           数据数组 + section 组件 + 渲染
styles.css        Tailwind 覆盖不了的东西(关键帧、复杂渐变)
```

### index.html 骨架

**版本号一律写死,不用 `latest`** —— latest 哪天变了,一个跑了半年的 demo 会突然白屏。

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,follow" />
<title>...</title>
<script src="https://cdn.tailwindcss.com/3.4.16"></script>
<script>
tailwind.config = {
  theme: { extend: {
    colors: { bg:'#FDFCFB', surface:'#FFFFFF', ink:'#2D2D2D', 'ink-2':'#6B6B6B', accent:'#E8919A' },
    fontFamily: { display:['"Playfair Display"','serif'], body:['Inter','system-ui','sans-serif'] },
  } }
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600&display=swap">
<link rel="stylesheet" href="styles.css">
</head>
<body class="bg-bg text-ink font-body">
<div id="root"></div>

<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
<script type="text/babel" src="components.jsx"></script>
<script type="text/babel" src="app.jsx"></script>
</body>
</html>
```

`tailwind.config` 的 colors / fontFamily **直接来自 DESIGN.md**,和静态稿的 `:root` 是同一批数字。参考 `h2odreamstudio/demos/landing-fnb-1/landing-fnb-1.html` 第 12–40 行。

### ⚠️ 三个必踩的坑

**1. `file://` 下 `<script src="*.jsx">` 会被 CORS 拦。**
浏览器不让 `file://` 页面 fetch 同目录文件。双击打开会白屏,控制台报 CORS。

两个解法,**交付时必须告诉用户**:
- 起个本地服务:`npx serve _replicas/<slug>` 或 `python3 -m http.server`
- 或者把 jsx 内联进 `index.html` 的 `<script type="text/babel">` 块里 —— 真要"双击就跑"就用这个

**默认用内联**,因为用户要的就是双击能看。拆成外部文件只在代码量大到影响阅读时才做,并写清要起服务。

**2. CDN 版没有模块语法。** `components.jsx` 里定义的东西靠**全局作用域**给 `app.jsx` 用,不要写 `import` / `export` —— 写了就报错。转 Vite 时才补上。

**3. `tailwind.config` 必须在 CDN script 之后、组件之前。** 顺序错了 config 不生效,颜色全变默认调色板。

### components.jsx

```jsx
const Icon = {
  Arrow: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

const Button = ({ children, variant = 'primary', ...p }) => (
  <button className={variant === 'primary'
    ? 'bg-accent text-white rounded-full px-7 py-3.5 font-medium hover:brightness-95 transition'
    : 'border border-black/10 rounded-full px-7 py-3.5 font-medium hover:bg-black/5 transition'} {...p}>
    {children}
  </button>
);

const Section = ({ children, className = '' }) => (
  <section className={`px-5 md:px-16 py-24 ${className}`}>
    <div className="mx-auto max-w-[1200px]">{children}</div>
  </section>
);
```

图标一律**内联 SVG**,不引图标库 —— 少一个 CDN 依赖,也不会因为图标库改版而变样。

### app.jsx

数据在顶部,组件在下面。照 `landing-fnb-1/app.jsx` 里 `DISHES` 的写法:

```jsx
const { useEffect, useState } = React;

const FEATURES = [
  { title: "...", desc: "...", img: "assets/f1.webp" },
];

function Hero() { /* ... */ }
function Features() { /* ... */ }

function App() {
  return <><Hero /><Features /></>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

### 动效

**默认克制**:scroll reveal(进入视口淡入上移)+ hover。除非原图明显有更强的动效语言(大幅视差、复杂时间轴)——那种是 `parallax-*` 五件套的活。

scroll reveal 用 IntersectionObserver,不引 GSAP:

```jsx
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      es => es.forEach(e => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}
```

### 转完必须再校验一次

React 版重跑一遍 `VERIFY.md` 的对比。**转换过程最容易丢的是间距** —— 静态稿手写的 `padding: 96px` 换成 Tailwind 的 `py-24` 是 96px 没错,但 `py-20` 就是 80px,顺手写错一档很难靠肉眼发现。
