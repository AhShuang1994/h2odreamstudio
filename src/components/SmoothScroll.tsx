"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { REDUCED_MOTION, SMOOTH_SCROLL_OK, smoothScrollAllowed } from "@/lib/motion";

/**
 * 平滑滚动惯性。渲染 null —— 它只是个挂载点。
 *
 * 只在桌面 + 非减弱动态偏好时启用，判定来自 `@/lib/motion`（见 ADR-0001）：
 * 触屏设备的系统原生滚动手感比任何 JS 惯性都好，低端机上接管滚动还会掉帧。
 *
 * 两条媒体查询都监听 change —— 桌面用户拖窄窗口、或在系统设置里打开减弱动态
 * 偏好，都应该当场生效，而不是等下一次刷新。
 */
export function SmoothScroll() {
  useEffect(() => {
    let lenis: Lenis | null = null;

    const sync = () => {
      if (smoothScrollAllowed() && !lenis) {
        // autoRaf 让 Lenis 自己跑 rAF —— 这里还没有别的每帧任务需要合流。
        // 等 #87 的滚动触发器进来，如果出现抖动再改成共用一个 ticker。
        lenis = new Lenis({ autoRaf: true });
      } else if (!smoothScrollAllowed() && lenis) {
        lenis.destroy();
        lenis = null;
      }
    };

    sync();

    const queries = [
      window.matchMedia(REDUCED_MOTION),
      window.matchMedia(SMOOTH_SCROLL_OK),
    ];
    for (const q of queries) q.addEventListener("change", sync);

    return () => {
      for (const q of queries) q.removeEventListener("change", sync);
      lenis?.destroy();
    };
  }, []);

  return null;
}
