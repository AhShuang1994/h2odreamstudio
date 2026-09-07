# screenshot-to-web — 踩过的坑

建立于 2026-09,技能刚落地,大部分格子还空着。**被用户纠正或自己踩坑之后写回这里**,别留在某个项目的 memory 里。

---

## 通用教训

### 1. `page.setContent` 里的 `<img src="file://...">` 加载不了

`setContent` 建出来的页面源是 `about:blank`,Chromium 不允许它加载 `file://` 资源 ——
`naturalWidth` 会是 0,但 `waitFor({state:'visible'})` **仍然会通过**(碎图占位框也算可见),
所以表现是"等到了图,却读不出尺寸",很容易误判成图片本身坏了。

**解法**:`img.mjs` 里本地图一律读成 data URI 内嵌(`toImgSrc()`),只有 http(s) 才直接给 URL。
写这个脚本时就是这么挂的,`crop` / `webp` / `compare` 三个子命令全中。

### 2. 转 WebP 不需要 sharp,Chromium 自己就能编

`canvas.toDataURL('image/webp', q)` 直接出 WebP。实测 1440x900 的 PNG 转出来 26 KB,
`file` 认成 `RIFF ... Web/P`,是真的 WebP 不是改了后缀的 PNG。

**好处**:整条链只依赖 Playwright。目标机器上 sharp 和 PIL 都可能没有,少一个装不上的理由。

### 3. `dewatermark.js` 不用跑了

Gemini 现在生成的图**已经没有水印**,`h2odreamstudio/scripts/dewatermark.js` 不再需要。
但 **PNG → WebP 这步还是要做** —— 原本那是 dewatermark 顺手做的,现在责任落到 `img.mjs webp`。

### 4. image prompt 用 fenced code block,不做 HTML 页

继承自 `parallax-art-director/LESSONS.md` 的用户偏好:曾按 skill 默认产出 3 个 `.prompts.html`,
用户一次都没打开,最后全删。**这里不要重犯。**

### 5. fullPage 截图不会滚动 —— scroll-reveal 的内容会整片留在未显形状态

`page.screenshot({fullPage:true})` 是一次性截整页,**不滚动**。页面若有 scroll-reveal
(元素默认 `opacity:0`,进视口才加 class 显形),首屏以下会截出**大片空白**。

真实踩法:拿 `demos/muse-apparel.html` 做试跑,第 2 段整片空白,差点当成页面本身的留白。
校验循环里这个坑更致命 —— 阶段⑤ 加了 reveal 之后再截图对比,会看到一堆不存在的差异。

**解法**:`img.mjs shot --full` 先滚一遍全页再回顶截。`--no-scroll` 可关掉。

### 6. 光滚动还不够,要 dispatch resize —— 无头下 rAF 被节流

滚一遍之后仍有一块(见证卡片)不显形:标题显形了,它下面的卡片没有。
原因是无头浏览器里 rAF 常被节流,**scroll 事件里靠 rAF 驱动的渲染永远不跑**。

绕法来自 `parallax-teardown/LESSONS.md` 第 8 条:滚动时同步 dispatch
`new Event('scroll')` 和 `new Event('resize')`,逼它走一遍布局回调。
每步停留也从 120ms 提到 250ms,到底再等 800ms 让 stagger 延迟走完。

**两条合起来才够。** 只加滚动会漏掉 rAF 那类;只 dispatch 不滚动,IntersectionObserver 不触发。

### 7. compare 的两栏是等宽缩放的

`img.mjs compare` 把两张图缩到同样的列宽。**两张图高度不同时,垂直缩放比例就不同**,
所有间距看起来都是错的。所以截自己的稿时,尺寸参数要和原图对齐(`--w 1440 --full`)。

---

## 待验证(首次本机跑通后回填)

### Gemini 生图那条路线,整段未经实测

写这个技能的 session 没有浏览器工具(`preview_start` / `computer` / `read_page`),
且 `gemini.google.com` 被网络策略挡掉,所以 `references/IMAGES.md` 的路线一是**照着
`parallax-teardown` 的工具用法推出来的,不是测出来的**。

首次在本机(Chrome 已登录 Gemini)跑通后,把下面几项的真实答案写进这里,
并删掉 `IMAGES.md` 里那条「未经实测」警告:

- [ ] 输入框怎么定位最稳
- [ ] 出图完成的判定信号是什么(轮询什么)
- [ ] 图怎么取下来(右键另存 / 下载按钮 / 直接读 img src)
- [ ] 一次能不能提交多条 prompt,还是必须一张一张来
- [ ] 有没有速率限制

### ~~Playwright 在 Windows 上的解析路径~~ —— 已验证 (2026-09-07)

`loadChromium()` 的回退链在 Windows 上**实测通过**:`npm i -g playwright` 之后,
`%APPDATA%\npm\node_modules` 那条候选命中,不需要设 NODE_PATH。

实测(Windows 11 / PowerShell / Node 22):

```
node $IMG shot https://example.com t.png --w 800 --h 600   → ✓ t.png (800x600)
node $IMG webp t.png t.webp --width 400                    → ✓ t.webp (400x300, 3 KB, q82)
node $IMG rows t.png --x 10                                → y 0–599 h=600 #eeeeee
```

三条分别验到:Playwright 解析 + Chromium 启动、canvas 的 WebP 编码、像素采样。

**注意:打印用法不算验证。** `loadChromium()` 只在子命令真正执行时才调用,
`node img.mjs` 不带参数打出用法那条路径根本不碰 Playwright ——
冒烟测试必须跑一个真的子命令。

---

## 项目特例

暂无记录。

### 8. 不要在文档里写死 `C:/Users/<名字>/` 这种绝对路径

同 repo 的其他技能顶部都写着 `C:/Users/Ah Shuang/.claude/skills/...`,但用户实际的
profile 是 `C:\Users\HUIHUANG` —— 换机器/改用户名之后那批路径**全部静默失效**,
没有任何报错,只是引用的文件读不到。

本技能一律用 `%USERPROFILE%` / `~`。

### 9. 按钮会继承正文的 `line-height`,这是最容易漏的高度来源

muse-apparel 试跑时,商品区比原图高 30px、见证区高 16px、hero 按钮高 5px ——
**三处一个根因**:`body{line-height:1.7}` 被按钮和图标行继承了。
12px 的字 × 1.7 = 20px 行高,加上内边距,按钮就从 34px 撑到 48px。

**规则**:写按钮、徽标、五星、图标行这类「一行文字的小件」时,一律显式给
`line-height:1.2` 或 `1`,不要让它继承正文行高。

这条也是**先量后改**的最好例子:光看并排图只会觉得「商品区有点松」,
量出来才知道是按钮高了 14px,而不是间距的问题。

### 10. 逐列采样是校验循环的主力,不是辅助

试跑里三轮收敛(+329px → +84px → +11px),每一轮的根因都是 `img.mjs rows`
定位的,没有一个是肉眼看出来的。反过来,像素采样看不到的东西(文字换行位置、
栏宽、图标大小)必须靠并排图补 —— **两个都要用,顺序是先量后看**。

`rows` 就是从这次试跑里长出来的,原本是个临时脚本。
