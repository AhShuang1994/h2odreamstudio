"""
程序化生成水面焦散平铺条 —— s1-L3-surface。

为什么不用出图模型：这层要的是「横向照明完全均匀、左右无缝可平铺」的**纹理**，
而模型画的是**有光源的场景**，天生带中心热点与四周渐晕。同一条要求写进 prompt
两次，中心/边缘比 2.08 → 8.46，越写越糟；第二次两端直接是纯黑，
连后期归一化都救不回来（没有内容可拉亮）。

焦散本身是波的干涉图样，用周期函数就能算。算出来的东西：
  · 左右无缝 —— 所有基函数的横向周期都是画布宽度的整数分之一
  · 横向绝对均匀 —— 没有光源，没有渐晕
  · 颜色精确落在 project.json 的 Palette 上
  · 平滑低频，WebP 压得很小

用法：
    python scripts/gen-caustics.py <输出.webp> [宽] [高]
"""

import sys
import numpy as np
from PIL import Image

# project.json 的 Palette
INDIGO = np.array([124, 130, 240], dtype=float)   # #7c82f0 中亮体色
TIP = np.array([154, 160, 255], dtype=float)      # #9aa0ff 最亮丝尖

# 画面纵向结构（占全高的比例），来自 s1-drop.json 的构图要求
TOP_BLACK = 0.12      # 顶部留纯黑，避免合成后出现横贯全屏的硬边
BAND_END = 0.40       # 焦散带的下缘
FADE_END = 0.65       # 到这里完全没入黑


def caustic_field(w, h, seed=7):
    """
    多个**方向不同**的平面波叠加，取零交叉附近的亮线 —— 这就是焦散的成因。

    ⚠️ 波矢必须是二维的 `cos(a·x + b·y)`，a、b 都不为零。
    第一版写成了 `cos(a·x + 相位随 y 调制)`，那是沿 x 单向传播的波，
    叠出来是一片竖条纹 —— 数字（均匀度、接缝）全部合格，但看起来完全不像水。
    **指标过不等于图对，一定要看。**

    a 取整数保证以画布宽为周期 → 左右天然无缝；b 任意，纵向不需要无缝。
    """
    rng = np.random.default_rng(seed)
    x = np.linspace(0, 2 * np.pi, w, endpoint=False)[None, :]
    y = np.linspace(0, 2 * np.pi, h, endpoint=False)[:, None] * (h / w)

    field = np.zeros((h, w))
    # (ax, by, 振幅)。ax 有正有负 = 波往左右两个方向走，交叉才成网。
    waves = [
        (3, 2.1, 1.00), (-2, 3.3, 0.92), (5, -1.7, 0.70),
        (-4, -2.6, 0.62), (7, 4.4, 0.44), (-6, 5.1, 0.38),
        (9, -6.2, 0.26), (-11, 7.7, 0.20),
    ]
    norm = sum(a for _, _, a in waves)
    for ax, by, amp in waves:
        field += amp * np.cos(ax * x + by * y + rng.uniform(0, 2 * np.pi))

    # 零交叉处最亮：取 |field| 再反相，波前相消的那条线就成了亮丝
    field = 1.0 - np.clip(np.abs(field) / (norm * 0.42), 0, 1)
    # 提幂把丝收细，网格感才出来
    return field ** 3.2


def vertical_envelope(h):
    """纵向包络：顶部纯黑 → 焦散带 → 渐隐到全黑。"""
    t = np.linspace(0, 1, h)
    env = np.zeros(h)
    # 顶部黑到带首，用平滑过渡避免硬边
    rise = np.clip((t - TOP_BLACK) / 0.06, 0, 1)
    fall = np.clip((FADE_END - t) / (FADE_END - BAND_END), 0, 1)
    env = rise * (fall ** 1.6)
    return (env * (3 - 2 * env) ** 1)[:, None]  # smoothstep 化


def equalize_columns(f, rows=None):
    """
    把横向照明压到绝对均匀。

    做法是除以每列均值的**周期性**平滑剖面 —— 剖面自己也是以画布宽为周期的，
    所以除完不破坏左右无缝。这一步在这里能用，而在 AI 出的那张图上不能用：
    那张图两端是纯黑，没有内容可以拉亮，除法救不回来。
    """
    # 只用焦散带那几行来量剖面：上下都是黑的，算进去会把剖面稀释掉
    prof = (f if rows is None else f[rows[0] : rows[1]]).mean(0)
    w = len(prof)
    k = max(3, (w // 12) | 1)
    # 环形卷积 —— 用 wrap 而不是 reflect，剖面才保持周期性
    pad = np.pad(prof, k // 2, mode="wrap")
    smooth = np.convolve(pad, np.ones(k) / k, mode="valid")[:w]
    return f * (smooth.mean() / np.maximum(smooth, 1e-6))[None, :]


def render(w, h, seed=7):
    band = (int(h * TOP_BLACK), int(h * BAND_END))
    f = np.clip(equalize_columns(caustic_field(w, h, seed), band), 0, 1)
    # 压平要在**所有非线性之后**再做一次：上面那次除法之后的 clip 会重新引入不均。
    f = np.clip(equalize_columns(f, band), 0, 1) * vertical_envelope(h)
    # 颜色：暗处走 INDIGO，最亮的丝尖走 TIP —— 亮度越高越偏 TIP。
    # 乘 f 会把中亮区压暗，所以先把整体亮度抬一档再乘，中亮区才落在目标 RGB 上。
    mix = np.clip(f[:, :, None] * 1.15, 0, 1)
    color = INDIGO[None, None, :] * (1 - mix) + TIP[None, None, :] * mix
    out = color * np.clip(f[:, :, None] * 1.45, 0, 1)
    return np.clip(out, 0, 255).astype(np.uint8)


def report(a):
    lum = 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]
    H, W = lum.shape
    band = lum[int(H * TOP_BLACK) : int(H * BAND_END)]
    prof = band.mean(0)
    seg = [prof[int(W * i / 8) : int(W * (i + 1) / 8)].mean() for i in range(8)]
    print("  8 段亮度", [round(s) for s in seg])
    print("  中心/边缘 %.2f  (目标 ~1.00)" % (np.mean(seg[3:5]) / np.mean([seg[0], seg[-1]])))
    # ⚠️ 无缝的判据是「末列能接上首列」，不是「末列等于首列」。
    # 拿跨接缝的相邻列差值，去比画面内部相邻列差值的分布 —— 落在同一量级才算无缝。
    wrap = np.abs(lum[:, 0] - lum[:, -1]).mean()
    inner = np.abs(np.diff(lum, axis=1)).mean()
    print("  接缝处相邻列差 %.2f   画面内部相邻列差 %.2f   比值 %.2f  (~1.0 = 看不出接缝)"
          % (wrap, inner, wrap / max(inner, 1e-6)))
    print("  顶 12%% 平均亮度 %.2f" % lum[: int(H * TOP_BLACK)].mean())
    # 只在有内容的像素里取分位数：整幅有六成是纯黑，混进去分位数会全落在 0 上
    flat = a.reshape(-1, 3).astype(float)
    l = lum.reshape(-1)
    lit = l > 4
    ll, fl = l[lit], flat[lit]
    print("  最亮 2%% RGB", fl[ll > np.percentile(ll, 98)].mean(0).round(0), " 目标 [154 160 255]")
    print("  中亮区   RGB", fl[(ll > np.percentile(ll, 60)) & (ll <= np.percentile(ll, 90))].mean(0).round(0),
          " 目标 [124 130 240]")


if __name__ == "__main__":
    dst = sys.argv[1]
    w = int(sys.argv[2]) if len(sys.argv) > 2 else 1280
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 2160
    a = render(w, h)
    report(a)
    Image.fromarray(a).save(dst, quality=88, method=6)
    import os
    print("  → %s  %dx%d  %.0fKB" % (dst, w, h, os.path.getsize(dst) / 1024))
