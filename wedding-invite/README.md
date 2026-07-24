# Hui Huang & Mayyi — 花园婚礼请柬(parallax)

婚期 2027-11-29,居銮 津津酒家。滚动叙事:**推开爬藤木门 → 沿花径走 → 绕过睡莲池(相册)→ 穿过花拱 → 抵达席位(RSVP + 导航)**。

**这是私人请柬,全站 noindex**(`site/index.html` 的 meta + `site/_headers` 的 `X-Robots-Tag` + `site/robots.txt` 三处)。

## 目录

```
site/            可部署的站(纯 HTML/CSS/JS,无依赖)
parallax/
  project.json         故事、Style Bible、五屏文案、openDecisions
  s1…s5-*.json         各屏美术规格(取景 / cutMode / 共用判定 / framing.verified)
  *.motion.json        各屏 k 值、canvas、转场
  scripts/             cutout.py(抠图)、pad_canvas.py(补画布)
  layers/final/*.webp  各屏叠预览(核对过的构图,装站时照抄 framing.verified)
```

## 本地跑

```bash
python -m http.server 8123 --directory wedding-invite/site
```

## 没进版本库的东西

`parallax/layers/` 下的 raw / cut / bg / ref / 各屏 final 子目录约 300MB 出图中间产物,已 gitignore。需要重做时:原图在本地 Downloads,按 `<section>.json` 里的 prompt 重出 → `scripts/cutout.py` 抠图 → `scripts/pad_canvas.py` 补画布。

## 待办

- **RSVP 没有后端** —— `site/script.js` 里只做本地确认,发给宾客前必须接一个 endpoint(Formspree / Google 表单 / Worker)。
- `parallax/project.json` 的 `openDecisions` 里还有一条 s2 文案对齐待拍板。
