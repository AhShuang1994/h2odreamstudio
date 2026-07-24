#!/usr/bin/env python
"""
cutout.py — 把白底图层图抠成透明 PNG (parallax art-director Phase 5)

用法:
    python cutout.py <输入目录> <输出目录> [--model isnet-general-use]

- 递归处理输入目录里的 .png/.jpg/.jpeg/.webp
- 输出同名 .png,带 alpha 通道
- 默认用 rembg 的 isnet-general-use 模型 + alpha matting(白底水彩边缘更干净)
- 额外把接近纯白的残留背景像素强制透明,消掉奶白/灰边
"""
import sys, os, io, argparse
from collections import deque
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True  # 容忍 dreamina 导出偶发的尾部截断

try:
    from rembg import remove, new_session
except ImportError:
    remove = new_session = None  # scene 模式不依赖 rembg

EXTS = (".png", ".jpg", ".jpeg", ".webp")

def scene_cut(im, tol=26, seed="both"):
    """场景层抠法:从顶边泛滥去除与天空同色的连通区,保留下方所有内容。
    适合浅色开阔场景(花径/水面/地面)—— 这类主体压在近白色上,rembg 会误删。

    seed="top" 只从顶边起泛滥 —— 当图里有**与底边相连的浅色地面**(白过道、白地毯)
    时必须用它,否则底边种子会顺着那片浅色一路吃穿整条地面(s5 席位的中央过道)。"""
    import numpy as np
    rgb = im.convert("RGB")
    a = __import__("numpy").asarray(rgb).astype(int)
    H, W, _ = a.shape
    ref = a[0:8, :, :].reshape(-1, 3).mean(0)
    dist = ((a - ref) ** 2).sum(2) ** 0.5
    bg = dist < tol
    vis = __import__("numpy").zeros((H, W), bool)
    dq = deque()
    for x in range(W):                      # 从顶边所有近天空像素起泛滥
        if bg[0, x]:
            vis[0, x] = True; dq.append((0, x))
    if seed == "both":
        for x in range(W):                  # 也从底边起(有些场景天空在下方留白)
            if bg[H - 1, x]:
                vis[H - 1, x] = True; dq.append((H - 1, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not vis[ny, nx] and bg[ny, nx]:
                vis[ny, nx] = True; dq.append((ny, nx))
    alpha = __import__("numpy").where(vis, 0, 255).astype("uint8")
    return Image.fromarray(__import__("numpy").dstack([__import__("numpy").asarray(rgb), alpha]), "RGBA")

def iter_images(root):
    for dp, _, files in os.walk(root):
        for f in files:
            if f.lower().endswith(EXTS):
                yield os.path.join(dp, f)

def clean_white_fringe(im, thresh=246):
    """把 rembg 留下的接近纯白/奶白的半透明残留进一步压成全透明。"""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r >= thresh and g >= thresh and b >= thresh:
                px[x, y] = (r, g, b, 0)
    return im

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("indir")
    ap.add_argument("outdir")
    ap.add_argument("--model", default="isnet-general-use")
    ap.add_argument("--mode", default="object", choices=["object", "scene"],
                    help="object=rembg 找主体(门/花丛/树等实心体);scene=顶部泛滥去天空(浅色开阔场景:花径/水面/地面)")
    ap.add_argument("--tol", type=int, default=26, help="scene 模式:天空同色容差")
    ap.add_argument("--seed", default="both", choices=["both", "top"],
                    help="scene 模式泛滥起点。图里有与底边相连的浅色地面(白过道/白地毯)时用 top,否则会被吃穿")
    ap.add_argument("--no-clean", action="store_true", help="跳过白边清理(细梢多时可保留原样)")
    a = ap.parse_args()

    session = new_session(a.model) if (a.mode == "object" and new_session) else None
    os.makedirs(a.outdir, exist_ok=True)
    imgs = list(iter_images(a.indir))
    if not imgs:
        sys.exit(f"输入目录没有图片: {a.indir}")

    for p in imgs:
        if a.mode == "scene":
            im = scene_cut(Image.open(p), tol=a.tol, seed=a.seed)
        else:
            with open(p, "rb") as fh:
                data = fh.read()
            out = remove(
                data, session=session,
                alpha_matting=True,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=15,
                alpha_matting_erode_size=3,
            )
            im = Image.open(io.BytesIO(out)).convert("RGBA")
            if not a.no_clean:
                im = clean_white_fringe(im)
        base = os.path.splitext(os.path.basename(p))[0] + ".png"
        dst = os.path.join(a.outdir, base)
        im.save(dst)
        bbox = im.getbbox()
        print(f"[cut] {os.path.basename(p)} -> {base}  size={im.size} content_bbox={bbox}")

    print(f"\n[done] {len(imgs)} images -> {a.outdir}")

if __name__ == "__main__":
    main()
