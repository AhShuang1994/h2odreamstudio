# JB 美容院网站 — Session 交接

> ⚠️ **2026-09-15 更新：暖陶土版 `demos/serai-beauty-jb.html` 已删除。**
> 原因：整页图都是 `picsum.photos` 随机占位图，不适合公开展示。
> **留下的是 Pop 版 `demos/serai-beauty-jb-pop.html`**（真实图，已上 `landing-page.html`）。
> 下面提到暖陶土版的段落、以及那个分支预览链接，都是历史记录，文件本身已不存在。

给下一个 session 的接手文件。读完这份 + `demos/jb-beauty-salon-BRIEF.md` 就能接着做，不需要前面的对话。

交接时间：2026-09-12
分支：`claude/loving-hypatia-jebd3f`
PR：https://github.com/AhShuang1994/h2odreamstudio/pull/137 （draft，未合并）
线上预览：https://claude-loving-hypatia-jebd3f.h2odreamstudio.pages.dev/demos/serai-beauty-jb.html

---

## 一、这是什么项目

给**马来西亚 Johor Bahru 一家美容院**做网站。h2odreamstudio 是个网页工作室 repo，这是其中一个 demo/客户案子。

品牌是虚构的示意资料：**Serai Skin Studio**，地址设在 Taman Mount Austin，内容（服务、价钱、评价、地址、电话）全部是编的，**待换客户真实资料**。

---

## 二、目前完成到哪里

### 已完成
- `demos/jb-beauty-salon-BRIEF.md` — 从 3 张参考图拆解的设计元素、JB 本地化需求、素材清单、决策记录
- `demos/serai-beauty-jb.html` — **首页 demo 成品，837 行，单档自包含**（暖陶土版本）

### 已推送的 commit（4 个，都在上述分支）
```
75ce7c9  价目表轮播 + 价目表移到营业时间之前
98b120b  手机版招牌疗程自动轮播
fddaab6  首页 demo（暖陶土方向）
6c372bc  规划记录文件
```

### 首页区块顺序（当前）
```
Hero → 价目表 → 营业时间 → 信任条 → 招牌疗程 → 配套
     → 品牌故事 → 顾客见证 → 地址地图 → Footer
```

---

## 三、已经定下来的决定（不要再问客户）

| 项目 | 决定 |
|---|---|
| 视觉方向 | **暖陶土**，但中性色用**冷灰**不用米黄（避开烂大街的 beige+brass+espresso） |
| 页面数量 | **多页站**（目前只做了首页） |
| 开发顺序 | 先做首页 demo 确认方向 |
| 首页必含 | 营业时间、服务项目、价格（三样都已做） |
| 手机版服务区 | **自动轮播**，3 秒换一张 |
| 手机版价目表 | **同样自动轮播** |
| 客群 | **25-45 岁女性**，维持不变 |
| 鲜艳风格第二版 | **做成并存的第二个档案**，不覆盖现有暖陶土版 |

---

## 四、主任务进度

### ~~主任务：鲜艳 Pop 风格第二版~~ 已完成（2026-09-12）

`demos/serai-beauty-jb-pop.html`，与暖陶土版并存，`serai-beauty-jb.html` 一行没改。完整拆解见 `jb-beauty-salon-BRIEF.md` 第五点六节。要点：

- 不规则 blob / 星芒 / 花 / 波浪线全是**内联 SVG symbol + `<use>`**，零装饰图片，跟着主题换色
- 配色 **完全暖色系**，橘红 `#F4561E` + 桃粉 + 蜜桃 + 奶油底 `#FDF3E9`
- **亮橘只能当填色和大字色**（白字在上面只有 3.39:1）。按钮和 chip 一律 `--deep` `#C33A0A`
- 标题 Archivo Black 全大写，手写体 Caveat **全页只用 5 次**，撑住 RM 288 的价位感
- 图片是 Codex 生成的示意图，在 `assets/demos/serai-pop/`，槽位都留了 `REPLACE` 注释
- 轮播 / 营业时间 / 滚动揭示的 JS 与暖陶土版逐字相同，没有重写

**下一步**：把两版一起发给客户挑，选定后删掉另一版，再展开多页站其余页面。

### 次要待决定（还没问出答案）
1. **预约方式** — 纯 WhatsApp / 表单+WhatsApp / 接 Fresha、Setmore
2. **语言** — 只英文 / EN+中文切换 / 加马来文（目前是英文为主 + 中文疗程名）
3. **是否卖零售产品** — 要电商还是纯展示
4. **技术栈** — 维持静态 HTML 还是上 CMS
5. **招牌疗程要不要挪到价目表旁边** — 现在被营业时间和信任条隔开

---

## 五、现有 demo 的技术细节（改之前先看）

### 配色 token（CSS variables，含深色模式）
```
--terracotta      #C2603F   大标题、装饰填色（对白 4.19:1，只能用在大字）
--terracotta-deep #A24B2E   按钮底色、小字强调（对白 5.86:1，过 AA）
--text            #1F2429   冷调近黑
--text-muted      #5A6470   石板灰
--bg / surface / surface-2 / surface-warm
```
深色模式下 terracotta 提亮成 `#E08A67`，按钮改成深色字。**改配色时必须重算对比度**，现有值都是算过的。

### 字体
- 标题 Playfair Display（衬线，只用在大标题）
- 内文 DM Sans
- 中文 Noto Sans SC（参考图的衬线字体没有中文字型，必须分开配）

### 圆角规则（一致性锁）
面板/卡片/图片 14px，按钮和 chip 全圆角，输入框 10px。

### 轮播（重点，别重写）
一个工厂函数 `makeCarousel({track, ui, item, label})` 驱动两个轮播：
```js
makeCarousel({track:'#treatments .cards', ui:'#carui',   item:'.card',  label:'Treatment'});
makeCarousel({track:'#prices .groups',    ui:'#priceui', item:'.group', label:'Price group'});
```
- ≤768px 生效，桌面自动回到 grid 并隐藏控件
- 3 秒自动切换，卡片出血到屏幕边缘让下一张露一角
- **自动播放停止条件**：手指碰到（停 6 秒后恢复）、区块滑出屏幕、分页切背景、按暂停键、系统开 reduced-motion
- **暂停键是 WCAG 2.2.2 硬需求**，不是装饰，不要删
- 进度点从滚动位置算，不是从计时器，所以手滑时也准

### 营业时间状态
用 `Intl.DateTimeFormat` 锁 `Asia/Kuala_Lumpur`，**不管访客在哪个时区都显示大马时间**。营业时间表：
```
周一 10:00-20:00   周二 休息   周三至周五 10:00-20:00
周六 09:30-19:00   周日 10:00-17:00
```

---

## 六、这个环境的坑（新 session 会踩到）

1. **网络出口策略挡住外部主机**。`images.unsplash.com`、`picsum.photos`、`api.openai.com` 全部 CONNECT 被拒（HTTP 000 / 403）。
   → 后果：**无法验证任何图片 URL 是否有效**，本地截图里图片、图标、地图全是空白。这是正常的，线上预览会正常显示。
   → npm registry 是通的（在 noProxy 名单里）。

2. **图片目前全是 `picsum.photos` 种子占位**，每个槽位都有 HTML 注释写明该换什么真实照片。需要客户提供实照。

3. **codex CLI 不在这个容器里**。容器是用完即弃、每个 session 重新 clone 的干净环境，装在别处的东西不会带进来。要每次都有，得放进环境的 setup script。而且 `api.openai.com` 被环境层网络策略挡住，开新 session 也不会变。

4. **CI 有一条长期红灯，不是我们的问题**：`Cloudflare Pages: h2odreamstudio-next` 在 `main` 上本来就是失败的（主项目 `h2odreamstudio` 是绿的）。已在 PR #137 留过完整说明，**不要重复留言，也不要试图在 repo 里修** —— 修法在 Cloudflare 后台（这个 repo 没有 `package.json`，但 `build.js` 用了 `npx clean-css-cli` 和 `npx terser`，`-next` 项目大概设了 build command 所以挂掉）。

5. **Playwright 截图**：环境装的 chromium 版本跟 npm 的 playwright 对不上，要指定路径：
   ```js
   chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'})
   ```

6. **`build.js` 会就地改写 `index.html` 和 `xhs.html`**。如果跑了它，记得 `git checkout --` 还原，别把 build 产物提交进去。它不碰 `demos/` 目录。

---

## 七、做完要跑的检查（现有 demo 全部通过）

```bash
# 零 em-dash（设计规范硬性要求）
grep -c $'—\|–' demos/serai-beauty-jb.html   # 必须是 0

# HTML 结构、CSS 大括号、JS 语法
# 横向溢出：1440 / 1366 / 390 三个宽度都必须无溢出
# 首屏 CTA 必须在折线上方
# 深浅色模式都要看过
# reduced-motion 下轮播必须静止
```

现有版本实测结果：三个宽度无横向溢出、首屏 CTA 都在折线上方、标题都 2 行、深浅色都正常、营业时间逻辑用 8 组边界时间验过、两个轮播独立运作互不干扰。

---

## 八、给客户的素材清单（还没拿到）

店名 / Logo / slogan、完整价目表、店面与店内高清照、**Before-After 对照图（需书面授权）**、美容师简介与执照、顾客好评授权、WhatsApp 号码、Google Maps 链接、社交帐号、域名。
