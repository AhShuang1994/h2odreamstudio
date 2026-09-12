# JB 美容院网站 — 参考拆解 & 规划记录

> 状态：**首页 demo 已完成，其余页面待开发**。此文件记录从 3 张参考图提取的可用元素、合并方案、本地化（马来西亚 Johor Bahru）需求，以及已确定的方向（见第五点五节）。

日期：2026-09-10
参考素材：图 A = Kaffee Akademie Hamburg（咖啡学院）｜图 B = Bakery（面包店）｜图 C = Lumière Hair Salon（发廊）

---

## 一、三张图各自可用的元素

### 图 C — Lumière Hair Salon（相关度最高，建议当主骨架 ★★★★★）

同属美业，结构几乎可以 1:1 搬过来。

| 元素 | 描述 | 用在美容院 |
|---|---|---|
| 字母间距 Logo | `LUMIÈRE` + 下方小字 `HAIR SALON`，宽字距衬线 | 中英双行 logo：英文名 + 下方「美容院 · Johor Bahru」 |
| 导航 + 主 CTA | 左 logo / 中导航（当前页下划线）/ 右实心「BOOK APPOINTMENT」按钮 | 右侧按钮改成 **WhatsApp 预约**（马来西亚最有效） |
| Hero 三行标题 | 前两行深色 + 第三行强调色（`Every Day.`） | 「Healthy Skin. Beautiful You. Every Day.」同款句式 |
| Eyebrow 小标 | 标题上方小字 `WHERE CONFIDENCE BLOSSOMS` | 品牌 slogan 位 |
| 社会证明条 | 重叠头像堆 + 「Loved by 500+ clients」+ 4.9/5 星 + 评论数 | 换成 **Google Reviews 真实评分**，可信度最高 |
| 圆形环绕文字徽章 | 旋转文字印章 | 「10 Years in JB」/「Est. 20XX」 |
| 4 格图标特色条 | 有竖分隔线：Premium Products / Expert Stylists / Personalized Care / Easy Booking | 正货产品 / 专业执照美容师 / 一对一咨询 / WhatsApp 即时预约 |
| 服务区（左文右卡） | 左：eyebrow + 标题 + 细横线 + 文案 + 「VIEW ALL SERVICES →」；右：4 张**拱形顶（上圆角）**卡片 | 拱形卡是这套设计的记忆点，建议保留 |
| 满版色块 Banner | 大面积 terracotta 底 + 图 + 白色描边按钮「OUR STORY →」 | 品牌故事 / 店内环境 |
| 结尾 CTA | 椭圆裁切的店内照 + 「Ready for Your Best Hair?」+ 按钮 + 淡色叶子线稿水印 | 「Ready to Glow?」+ 预约按钮 |
| 深色 Footer | logo + tagline + 社交图标 / Quick Links / Information / Contact（电话、email、地址各带小图标） | 加上 Google Map + Waze + 营业时间 |

### 图 A — Kaffee Akademie（"课程/套餐"逻辑，相关度 ★★★★）

咖啡「课程」= 美容院「疗程套餐」，商业模型一致，最值得抄的是**卖套餐的模块**。

| 元素 | 用在美容院 |
|---|---|
| 悬挂式圆形折扣贴纸「40% Discount」 | 首次体验价 / 开幕促销贴纸，转化率高 |
| Hero 双 CTA：实心「Contact Us」+ 幽灵「▷ Watch Demo」 | 实心「WhatsApp 预约」+ 幽灵「▷ 看店内环境影片」 |
| Hero 下方双栏套餐对比（竖排旋转标签 NORMAL / SUPER COURSE + 划线价 `45$ ~~85$~~`） | **单次 vs 配套价对比**，划线价对马来西亚市场特别有效 |
| 筛选 Chips（Barista / Sensory / Vouchers / View All） | 服务分类筛选：面部 / 纹绣 / 美睫 / 美甲 / 脱毛 |
| 疗程卡片 3-up | 缩略图 + meta 行（时长 · 评分星星）+ 标题 + 「by 美容师名」+ 价格 + 「立即预约」按钮 |
| 「Scroll Down」圆形箭头按钮 | 小巧的引导细节，可留 |
| 品牌故事：左图片拼贴（两张堆叠）+ 右文字 | 老板 / 创办故事 |
| 客户见证卡（公司 Logo + 引言 + 头像+姓名+职位） | 改成**顾客头像 + 姓名 + 做过的疗程**（公司 logo 不适用 B2C） |
| 完整联络表单（姓名 / Email / 电话 / 留言） | 保留，但**电话栏要 +60 前缀**，且表单不该是唯一入口 |
| 深色 Footer：Legal / Main Menu / Social Media + Newsletter 内嵌输入框 + 付款图标行 | 付款图标行改成本地：FPX / TNG / GrabPay / DuitNow |

### 图 B — Bakery（视觉手法，相关度 ★★★）

结构参考价值低，但**视觉技巧**可以直接借。

| 元素 | 用在美容院 |
|---|---|
| 整页圆角容器浮在渐变底上 | 高级感做法，但会牺牲一点满版冲击力 — 需决定 |
| 药丸型（全圆角）导航与按钮 | 比图 C 的直角按钮更柔和、更「美容」 |
| **衬线标题 + 斜体强调字**（`Products we *bake* daily`） | 最容易见效的一招：`Skin that *glows* from within` |
| Hero eyebrow 标签串（`Fresh today · Sourdough · Butter`） | `Facial · Brows · Lashes · Nails` |
| 圆形「100% NATURAL」徽章 | 「KKM 认证」/「正货保证」/「无痛技术」 |
| 背景线稿手绘装饰 | 淡色植物 / 脸部线条线稿，成本低、质感高 |
| 不对称图片拼贴（2 小 + 1 宽） | 环境照 / Before-After 拼贴 |
| 打勾清单（强调色勾号） | 「我们的坚持」：正货产品、一对一、不硬推销、消毒流程 |
| 深色圆角 CTA 卡片（`Pre-orders`） | 会员配套 / 预约订金卡片 |
| 卡片式产品格（图 + 标题 + 短描述 + 强调色价格） | 零售护肤品区（如果有卖产品） |

---

## 二、合并后的建议首页结构

> 骨架用 **图 C**，套餐/价格模块用 **图 A**，字体与圆角调性用 **图 B**。

```
01  导航栏          图C 结构 + 图B 药丸按钮 + 语言切换 EN/中文
02  Hero            图C 三行标题（第三行强调色）+ 图B eyebrow 标签串
                    + 双 CTA（图A：实心 WhatsApp + 幽灵 看影片）
                    + 图A 悬挂式促销贴纸（首次体验 RM XX）
03  社会证明条       图C：头像堆 + Google 评分 4.9/5
04  4 格特色条       图C：图标 + 竖分隔线
05  服务分类         图A chips 筛选 + 图C 拱形卡片
06  ★ 招牌疗程       图A 卡片 3-up：图 + 时长/评分 + 名称 + 美容师 + 价格 + 预约
07  ★ Before / After 三图都没有 — 美容院必备，滑动对比或前后并排
08  套餐价格         图A 双栏对比 + 划线价（单次 vs 配套 vs 会员）
09  品牌故事         图C 满版色块 banner 或 图A 图片拼贴
10  美容师团队       三图都没有 — 建议加，含执照/年资
11  顾客见证         图A 卡片，改成顾客头像 + 疗程名
12  环境相册         图B 不对称拼贴
13  FAQ             三图都没有 — 对 SEO 和减少 WhatsApp 重复问题很有用
14  地图 + 营业时间  三图都没有 — JB 实体店必备
15  预约 CTA         图C 结尾区 + 图B 深色圆角卡片
16  Footer          图A 四栏结构 + 图C 联络图标 + 本地付款图标
17  浮动按钮         WhatsApp 常驻右下角（三图都没有，但大马标配）
```

---

## 三、视觉方向（三选一，待决定）

| | 方向 1：暖陶土（贴近图 C） | 方向 2：奶油金（贴近图 B） | 方向 3：可可米色（贴近图 A） |
|---|---|---|---|
| 主色 | Terracotta `#C1704F` | Amber `#F5A524` | Coffee `#5C3A21` |
| 底色 | 米白 `#FAF6F1` | 奶油 `#FDF6EC` | 米灰 `#EDE8DF` |
| 感觉 | 温柔、女性、疗愈 | 明亮、亲切、大众 | 沉稳、高端、成熟 |
| 客群 | 25–45 白领女性 | 20–35 年轻客群 | 35+ 高消费客群 |
| 圆角 | 中（8–16px）| 大（全圆角药丸）| 小（4px，偏硬朗）|
| 建议 | ★ 美容院最安全的选择 | 适合走量、促销型 | 适合高价疗程 |

**字体建议（三图共通做法）：** 标题用衬线（Playfair Display / Cormorant / Fraunces）+ 内文用无衬线（Inter / DM Sans）。中文标题建议 Noto Serif SC，内文 Noto Sans SC — 因为参考图的衬线字体没有中文字型，中英混排必须另配。

---

## 四、JB 本地化 — 三张图都没有但必须加

这是三张图（德国、欧美风）最大的缺口：

1. **WhatsApp 优先** — 右下角浮动按钮 + 所有 CTA 指向 `wa.me/60XXXXXXXXX?text=` 预填讯息（含疗程名）。大马客户不填表单。
2. **语言切换** — 建议 EN + 简体中文双语（JB 华人客群大）；马来文视客群决定。
3. **新加坡客源** — JB 有大量新币客人。可考虑显示「RM XX（≈ SGD XX）」，并注明近 CIQ / 关卡车程。
4. **地图** — Google Maps 嵌入 + **Waze 链接**（大马人用 Waze 多过 Google Maps）+ 停车说明。
5. **营业时间** — 含公共假期 / 农历新年公告位。
6. **付款方式图标** — FPX、Touch 'n Go eWallet、GrabPay、DuitNow QR、Boost、信用卡。
7. **社交媒体** — Instagram、Facebook、TikTok、**小红书**（JB 华人 + 新加坡客群搜店常用）。
8. **Google Business Profile** — 评分直接嵌入首页，并放「Write a Review」入口。
9. **SEO 关键词** — `facial Johor Bahru`、`美容院 新山`、`eyebrow embroidery JB`、`美睫 新山`、`facial near Mount Austin / Bukit Indah / Taman Molek`（分区页对本地 SEO 很有效）。
10. **合规** — PDPA 私隐政策（表单收集资料需要）；若有医美类疗程，注意 KKM 广告用词限制（不可宣称疗效）。

---

## 五、需要客户提供的素材清单

- [ ] 店名、Logo（或需另设计）、slogan
- [ ] 完整服务与价目表（单次 / 配套 / 会员）
- [ ] 高清照片：店面外观、店内环境 ×5–8、疗程进行中 ×5、美容师人像
- [ ] **Before / After 对照图**（需客户书面同意才可公开）
- [ ] 美容师简介 + 执照 / 证书
- [ ] 顾客好评（含姓名与照片授权）
- [ ] WhatsApp 号码、Google Maps 链接、营业时间
- [ ] 社交媒体账号
- [ ] 域名（是否已有？）

---

## 五点五、已确定的方向（2026-09-12）

| 项目 | 决定 |
|---|---|
| 视觉方向 | **方向 1 暖陶土**。配色搭**冷灰**中性色而非米黄，避开烂大街的 beige+brass 组合 |
| 页面数量 | **多页站** |
| 开发顺序 | **先做一版首页 demo** 确认方向 |
| 首页必含 | 营业时间、服务项目、价格 |

首页 demo 成品：`demos/serai-beauty-jb.html`（虚构品牌 Serai Skin Studio，内容为示意，待换客户真实资料）。

**手机版服务区为自动轮播**（2026-09-12 加）：≤768px 时 4 张招牌疗程卡变成横向 snap 轮播，每 3 秒自动切换一张，卡片出血到屏幕边缘让下一张露一角提示可滑。桌面版维持 4 栏网格不变。
自动播放会在这些情况停下：手指碰到轮播（停 6 秒后恢复）、区块滑出屏幕、分页切到背景、用户按暂停键、系统开了 reduced-motion。
**暂停键是必须的**，不是装饰：3 秒自动轮播属于 WCAG 2.2.2「移动内容」，没有暂停机制客户还没看完第二张卡的价钱就被切走了。

设计执行上的两个取舍：

1. **衬线只用在大标题**（Playfair Display），内文走无衬线（DM Sans），中文另配 Noto Sans SC。参考图的衬线字体都没有中文字型，中英混排必须分开配。
2. **配色走「陶土 + 冷灰」**。参考图 1、2 都是暖米黄底，但那套 beige + brass + espresso 是美业网站最泛滥的配色，品牌会被淹没。改用冷灰中性色衬托陶土，陶土反而更跳。

---

## 六、待决定事项

1. ~~视觉方向~~ — 已定：暖陶土（见上节）
2. ~~页面数量~~ — 已定：多页站
3. **预约方式** — 纯 WhatsApp 链接 / 表单 + WhatsApp / 接入线上预约系统（Fresha、Setmore）？
4. **语言** — 只英文？EN + 中文？加马来文？
5. **是否卖产品** — 需要电商功能还是只展示？
6. **技术栈** — 沿用本 repo 的静态 HTML + CSS（同 `demos/` 现有做法，可直接 GitHub Pages 上线），还是要 CMS 让客户自己改内容？
7. ~~先做 demo 还是先做完整站~~ — 已定：先做首页 demo
8. **首页 demo 的图片** — 目前是 `picsum.photos` 占位，需要客户真实照片（见第五节素材清单）
9. **多页站其余页面** — 确认首页方向后展开：服务 / 价格 / 团队 / 相册 / 关于 / 联络

---

## 七、跟本 repo 现有 demo 的关系

`demos/glowseoul-skincare.html` 是最接近的既有案例（护肤类），可参考其结构与代码风格再做差异化。建议新档案命名：`demos/<品牌名>-beauty-jb.html`，或若组件较多则用资料夹形式（参考 `demos/landing-fnb-1/`）。
