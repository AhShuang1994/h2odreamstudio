#!/usr/bin/env python
"""
pad_canvas.py — 把抠好的透明层按 motion.json 的 canvas 补画布到渲染尺寸
(parallax art-director Phase 5)

用法:
    python pad_canvas.py <section.motion.json> <desktop|mobile> <抠图目录> [输出目录]

规则(和 SKILL 一致):
- 缩到目标 canvasW,底部对齐,顶部补透明,到 canvasH
- padStrategy == "transparent" 的层才处理
- "integral" / "outpaint" -> 跳过(天空整幅层,顶部不能留透明,另走 outpaint/整幅)
- "css-gradient" -> 跳过(mobile 天空走 CSS,不出图)
- 按 layer id 在抠图目录里模糊匹配文件名(含 'l1-far-wall' 之类 token)
"""
import sys, os, json, re
from PIL import Image

EXTS = (".png", ".webp")

def find_file(layer_id, d, section=None):
    """按 layer id token 匹配;**优先**同一屏(s1/s2/s3…)前缀的文件。
    不加屏前缀过滤的话,s2 与 s3 都有 'L1-far-trees',会互相串档。"""
    token = layer_id.lower()
    prefix = None
    if section:
        m = re.match(r'^(s\d+)', section.lower())
        if m:
            prefix = m.group(1) + "-"
    cands = [f for f in os.listdir(d)
             if f.lower().endswith(EXTS) and token in f.lower()]
    if not cands:
        return None
    if prefix:
        same = [f for f in cands if f.lower().startswith(prefix)]
        if same:
            cands = same
        else:
            return None          # 本屏没有这层的图 -> 报 MISS,而不是错拿别屏的
    return os.path.join(d, sorted(cands, key=len)[0])

def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    motion_path, bp, cut_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    out_dir = sys.argv[4] if len(sys.argv) > 4 else os.path.join(cut_dir, "..", "final", bp)
    out_dir = os.path.normpath(out_dir)

    with open(motion_path, encoding="utf-8") as fh:
        motion = json.load(fh)
    if bp not in motion["breakpoints"]:
        sys.exit(f"motion.json 没有 breakpoint: {bp}")
    layers = motion["breakpoints"][bp]["layers"]
    os.makedirs(out_dir, exist_ok=True)

    done = skipped = missing = 0
    for L in layers:
        lid = L["id"]
        strat = L.get("padStrategy", "transparent")
        cw, ch = L["canvas"]["w"], L["canvas"]["h"]
        if strat in ("css-gradient", "integral", "outpaint"):
            print(f"[skip] {lid}  ({strat})")
            skipped += 1
            continue
        src = find_file(lid, cut_dir, motion.get("section"))
        if not src:
            print(f"[MISS] {lid}  no matching file in {cut_dir}")
            missing += 1
            continue
        im = Image.open(src).convert("RGBA")
        h = round(cw * im.height / im.width)
        scaled = im.resize((cw, h), Image.LANCZOS)
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        if h > ch:                          # 内容比画布还高:底部对齐,顶部裁掉溢出
            scaled = scaled.crop((0, h - ch, cw, h))
            canvas.paste(scaled, (0, 0))
        else:
            canvas.paste(scaled, (0, ch - h))
        dst = os.path.join(out_dir, f"{lid}.png")
        canvas.save(dst)
        print(f"[pad ] {lid}  {os.path.basename(src)} -> {os.path.basename(dst)}  canvas={cw}x{ch} (scaledH={h}, padTop={max(0,ch-h)})")
        done += 1

    print(f"\n[done] padded {done}, skipped {skipped}, missing {missing} -> {out_dir}")

if __name__ == "__main__":
    main()
