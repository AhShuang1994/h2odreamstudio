# 部署收敛到 Cloudflare Pages，重构期间用第二个项目并行

**实测发现仓库同时挂着两套部署**（2026-07-27 核实）：

| | 状态 |
|---|---|
| Cloudflare Pages 项目 `h2odreamstudio` | 已连接仓库、构建正常、服务于 `h2odreamstudio.pages.dev`。响应头只有 `server: cloudflare` / `cf-ray` |
| GitHub Pages | `build_type: legacy`，`source: { branch: main, path: "/" }`，绑定了自定义域名 |
| `www.h2o-dreamer-studio.com` | 由 Cloudflare 代理，但**回源到 GitHub Pages** —— 响应头带 `x-github-request-id`、`via: 1.1 varnish`、`x-served-by: cache-*`（Fastly，GitHub Pages 的 CDN） |

两套都在发同一份内容，所以长期没被发现。**Cloudflare Pages 项目确实存在，但生产域名从未真正切过去。**

同时 `.gitignore` 忽略了 `out/`，而现有 CF Pages 项目**没有配置构建命令**（老站是根目录的静态 HTML，直接发即可）——**Next 重构在当前配置下没有任何上线路径**。

决定：**重构期间新建第二个 Cloudflare Pages 项目**指向重构分支并配好构建；老项目与 GitHub Pages 保持原状继续服务旧站。全部验证通过后，把自定义域名挂到新项目，同时关闭 GitHub Pages 并删除 `CNAME` 文件（那是 GitHub Pages 的产物）。

## Considered Options

- **直接改现有 CF Pages 项目的构建配置**——少一个项目，但构建设置是项目级而非分支级：加上构建命令后 `main` 会持续失败（`main` 上没有 `package.json`），等于在「主分支构建一直红」的状态下开发数周。
- **GitHub Actions + `actions/deploy-pages`**——不换托管商、不动 DNS，但并行预览要额外折腾。
- **把 `out/` 提交到根目录**——构建产物进版本库，且与 [ADR-0006](./0006-repo-boundary-and-history-rewrite.md) 的历史瘦身直接相悖。

## Consequences

- 两个项目互不干扰：旧站从头到尾正常服务，新站有独立的 `*.pages.dev` 可随意折腾。切换即「把自定义域名挂到新项目」，**零宕机窗口**。
- ⚠️ **合并到 `main` 是个危险时刻。** GitHub Pages 从 `main` 根目录自动发布 —— 一旦 Next 源码树进 `main` 而域名仍挂在 GitHub Pages 上，线上会当场变成一堆源文件。因此**必须先切域名、关掉 GitHub Pages，再合并**。
- 迁移比预想的轻：域名已在同一个 Cloudflare 账户内（权威 NS 为 `damon.ns.cloudflare.com`），无需更换 nameserver。
- 收敛完成后只剩一套部署，少一个长期误解来源。
- 可用 `_redirects` 文件，与 [ADR-0003](./0003-trailing-slash-false.md) 的双保险重定向配套。
- ⚠️ 构建配置必须确认输出目录**不含** `wedding-invite/`——那是必须保持 noindex 的私人内容，见 [ADR-0006](./0006-repo-boundary-and-history-rewrite.md)。
