# IMAGES —— 三条配图路线

**跑到配图这步,第一件事是探测能力,第二件事是告诉用户走了哪条。**

> ⛔ 不许默默用 placeholder 然后说"做好了"。用户以为图是真的,发给客户才发现全是灰块,这是交付失败。

## 探测顺序

| 顺序 | 探什么 | 通过条件 |
|---|---|---|
| 1 | 当前 session 有没有浏览器工具 | `preview_start` / `computer` / `read_page` 可用 |
| 2 | 能不能联网抓图 | `curl -s -o /dev/null -w "%{http_code}" https://images.unsplash.com/...` 返回 200 |
| 3 | —— | 以上都不行 → 路线三 |

探完先说一句,比如:
`配图路线:浏览器工具不可用、外网被挡 → 走 placeholder,并给你一份 Gemini prompt 清单。`

---

## 路线一 · Gemini 生图(经 Claude for Chrome 工具)

> ⚠️ **这一段未经实测。** 写它的 session 没有浏览器工具,且 `gemini.google.com` 被网络策略挡掉。
> **首次在本机跑通后,把真实的输入框定位方式 / 等待时机 / 取图方式写回 `LESSONS.md`,并删掉这条警告。**

用户的环境:Chrome 已登录 Gemini(`gemini.google.com/images`,Nano Banana),浏览器工具来自 Claude for Chrome 扩展 —— 和 `parallax-teardown` 用的是同一批工具。

### 步骤

1. **先写全部 prompt**(见下面「prompt 写法」),一次写完,不要生一张写一张
2. `preview_start { url: "https://gemini.google.com/images" }`
3. `read_page` 确认页面到位、已登录(没登录就停下来告诉用户去登录,不要试图代登)
4. `computer` 点输入框 → 打 prompt → 提交
5. 等出图。**用 `read_page` 轮询,不要用固定 sleep** —— 生成耗时随负载浮动
6. 取图存进 `_replicas/<slug>/_src/_inbox/`
7. `img.mjs webp` 转格式 → 接进页面

### 待实测确认的点(首跑时逐条记进 LESSONS.md)

- 输入框怎么定位最稳
- 出图完成的判定信号是什么
- 图怎么取下来(右键另存 / 下载按钮 / 直接读 img src)
- 一次能不能提交多条 prompt,还是必须一张一张来
- 有没有速率限制

---

## 路线二 · 联网找免费图

可达就找相似图,下载 → `img.mjs webp` 转格式 → 接进页面。

**必须在交付说明里写清每张图的来源和授权。** 免费不等于随便用 —— 商用、署名要求各家不同。这条不能省,客户站上线后出问题是真的麻烦。

---

## 路线三 · placeholder + prompt 清单

两样都要给:

**1. 页面里的占位块** —— 尺寸正确(见 `BUILD.md` 的 `.ph` 写法)

**2. `_replicas/<slug>/IMAGES-TODO.md`** —— 逐个图位列出:位置、尺寸、宽高比、需要什么内容

**3. 可直接粘进 Gemini 的 prompt 清单** —— 一条一个 fenced code block

> 📌 **用 fenced code block,不要做 `.prompts.html` 页面。**
> 这条来自 `parallax-art-director/LESSONS.md` 的明确用户偏好:曾按默认产出 3 个 `.prompts.html`,用户一次都没打开,最后全删。

---

## prompt 写法

每条 prompt 必须包含五件事,少一件出来的图就接不进页面:

| 要素 | 为什么 | 例子 |
|---|---|---|
| **主体** | 画什么 | `a ceramic skincare bottle, matte finish` |
| **构图与留白** | 图要放进固定尺寸的框里,主体位置不对就得裁 | `centered, generous negative space on the left third` |
| **光线** | 决定它能不能和页面其他图看起来是一套 | `soft diffused daylight from the upper left, gentle falloff` |
| **色调** | 必须锁死 DESIGN.md 的 palette,否则每张图各走各的 | `warm off-white background #FDFCFB, muted rose accents #E8919A` |
| **宽高比** | 不写会拿到方图,塞进 16:9 的位就变形 | `4:3 aspect ratio` |

### 三条硬规则

**1. 明度结构要写死,不能只给色号。**
只给 palette,模型会把整幅拉到最浅那个色,出来一片病态的淡黄。要写「深/中/浅三段明度拉开」,并明确禁止:`avoid an overall pale cream or yellow haze`。
(来源:`parallax-art-director/LESSONS.md` 的真实教训)

**2. 出图太淡不要靠后期调色救。** 提饱和度会整片发黄。**配色只能回 prompt 改。**

**3. 同一页的所有图要用同一套光线和色调描述。** 一张暖光一张冷光,拼在一页上立刻穿帮。第一张出好后,把它当风格基准,后面每条 prompt 都带同样的光线色调段落。

---

## 不管走哪条:一律转 WebP

```bash
node "$IMG" webp in.png out.webp --width 1440 --quality 82
```

`--width 1440 --quality 82` 是 `h2odreamstudio/GEO-CHECKLIST.md` 记的规格,沿用。

**不要跑 `dewatermark.js`** —— Gemini 现在生成的图已经没有水印了,那个脚本(和它依赖的 sharp)不再需要。
