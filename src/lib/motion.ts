/**
 * 全站动效的**唯一判定点**。
 *
 * 平滑滚动、逐行揭示、遮罩视差、幕布转场四处动效都读这里的结论，不各自去查
 * matchMedia —— 判定散在四个文件里，迟早会出现「视差关了、揭示还在跑」这种
 * 半开半关的状态。见 #85。
 *
 * 这里只回答「要不要跑」，不碰 gsap、不注册插件。插件由用到它的那个组件
 * 按需 import（`import ScrollTrigger from "gsap/ScrollTrigger"`），永远不要
 * 从 `gsap/all` 整包引入 —— 首屏 JS 上限 200KB，见 ADR-0008。
 */

/** 减弱动态偏好。开了就一律不跑动效，这是无障碍正确性，不是手感偏好。 */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * 平滑滚动的启用条件。
 *
 * 宽度之外还要 `pointer: fine`：触屏设备的系统原生滚动手感比任何 JS 惯性都好，
 * 低端机上接管滚动还会掉帧。只看宽度会把触屏笔电与横屏平板算成桌面。
 * 见 ADR-0001。
 */
export const SMOOTH_SCROLL_OK = "(min-width: 1024px) and (pointer: fine)";

/** 服务端渲染阶段一律返回 false —— 首屏必须是「动效还没跑」的那个完整状态。 */
function matches(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

export function prefersReducedMotion(): boolean {
  return matches(REDUCED_MOTION);
}

/** 动效总开关。任何动效代码开跑之前先问这一句。 */
export function motionAllowed(): boolean {
  return typeof window !== "undefined" && !prefersReducedMotion();
}

/** 平滑滚动的开关 = 总开关 ∧ 桌面。 */
export function smoothScrollAllowed(): boolean {
  return motionAllowed() && matches(SMOOTH_SCROLL_OK);
}
