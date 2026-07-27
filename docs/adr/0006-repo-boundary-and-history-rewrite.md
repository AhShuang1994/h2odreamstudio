# 婚礼请柬移出本仓库，并重写历史剔除大图

`public/` 有 546MB（`assets/` 占 543MB），`.git` 有 667MB。另有一个 300MB 的私人项目 `wedding-invite/` 未跟踪地躺在仓库里。两件事一起处理：**婚礼请柬迁到独立 private repo**；**用 `git filter-repo` 把已提交的 `assets/wedding/*.jpg` 从历史中剔除**。

## Consequences

### 边界

- 婚礼请柬（Hui Huang & Mayyi，婚期 2027-11-29）与本站目标**相反**：它必须保持 noindex，本站全力 GEO 收录。放在同一仓库里，Cloudflare Pages 的构建配置一旦覆盖到它，私人请柬就上线了。
- 它有独立的生命周期（婚期后归档），也有独立的规格文件树。

**已于 2026-07-27 执行完毕** → [`AhShuang1994/wedding-invites`](https://github.com/AhShuang1994/wedding-invites)（private）。

**这条决定不是预防性的 —— 风险已经发生了。** 迁移过程中实测发现：`wedding-invite/` 早已提交在 `main` 根目录（68 个文件，PR #62 / #63），而 GitHub Pages 正是从 `main` 根目录发布，因此私人请柬**一直是公开可访问的**，包含真人照片相册。站内自带的三重 noindex 在 GitHub Pages 上只有一层真正生效：

| 防护 | 实际 |
|---|---|
| `_headers` 的 `X-Robots-Tag` | 失效 —— `_headers` 是 Cloudflare Pages / Netlify 的约定，GitHub Pages 不读它 |
| 子目录下的 `robots.txt` | 失效 —— robots.txt 只在域名根目录被读取，而根目录那份写的是 `Allow: /` |
| `index.html` 的 `<meta robots>` | 生效，但只保护 HTML 页面，不保护图片 |

教训：**「站点自带 noindex」不等于「不会被公开访问」**，而且防护是否生效取决于托管平台。私人内容与公开内容混在同一个可部署目录里，本身就是缺陷；隔离仓库才是根治。

### 图层美术走 Release 附件，不进 git

迁移时新增的决定。请柬的 `parallax/assets/` 与 `parallax/layers/` 共 **292MB / 97 个文件**，打包成压缩档挂在新仓库的 **Release 附件**上；git 里只有 53 个文件 / 6.7MB（自足的 `site/` + 分幕与 motion 规格 + 抠图脚本）。

- 已排除**全部提交进 git**：新仓库一开始就 300MB，且 parallax 项目仍在做，每轮重出图还会再长一层 —— 正是主仓库刚吃过的亏。
- 已排除 **Git LFS**：GitHub 免费额度仅 1GB 存储 + 1GB/月流量，292MB 会吃掉大半。
- 已排除**只靠本地备份**：原 `.gitignore` 的注释写着「靠 Downloads 原图 + scripts/ 可重跑」，但这些图层是 **AI 生成的，换 seed 就是另一张图** —— 重跑还原不了。把不可复现的美术资产托付给一个下载文件夹是真实风险。
- Release 附件不进 git 历史、不占 LFS 额度，且 private 仓库的 release 同样私有。重出图后传一个新的 Release 即可。

### 资产瘦身

- 实测：**47 个原图已有 webp 兄弟，共 383.2MB，可直接删**；27 个无 webp 版的 jpg/png 共 128.1MB，转换后删；实际上线用的 webp 只有 31.2MB。`public/` 可从 543MB 降到约 35MB。
- `.gitignore` 已挡住 blog 与 demos 的 PNG，**漏了 `assets/wedding/*.jpg`**——那 35 张原图（单张 9~12MB）已进历史，删工作区文件不会让仓库小一个字节。
- 240 帧的 `scrub-frames{,-desktop}/`（16.3MB）一并删除：注释显示这批是从 `ember-scroll` 借来的**占位素材**，不是本站内容；原型实现一次性预加载全部 120 帧；而帧序列 scrub 本就不是 ERA 的手法（见 [ADR-0001](./0001-linear-surface-era-motion.md)）。hero 改用循环短视频。

### 顺序约束

`filter-repo` 会改掉所有 commit SHA 并需要 force push，已有的 PR 与 commit 引用会失效。它**必须在工作区干净时执行**——当前工作区同时挂着 199 个待处理删除与 517 个未跟踪文件。正确顺序是：先提交重构 → 清空工作区 → 再重写历史 → force push。
