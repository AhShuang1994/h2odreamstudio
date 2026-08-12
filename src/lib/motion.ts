/**
 * React 侧动效的判定点。
 *
 * 只回答「要不要跑」，不碰 gsap、不注册插件。插件由用到它的那个组件按需
 * 动态 import，永远不要从 `gsap/all` 整包引入 —— 首屏 JS 上限 200KB，
 * 见 ADR-0008，`test/export/motion.test.ts` 守着这条。
 *
 * ⚠️ 平滑滚动与幕布**不在这里** —— 它们要同时跑在静态内容页上，实现在
 * `public/js/motion.js`（原生，无打包器）。那份文件里有同一套媒体查询，
 * 改一处就要改另一处。见 ADR-0001 与 #89。
 */

/** 减弱动态偏好。开了就一律不跑动效，这是无障碍正确性，不是手感偏好。 */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * 桌面判定。宽度之外还要 `pointer: fine` —— 只看宽度会把触屏笔电与横屏平板
 * 算成桌面，而这些设备正是要避开的（低端机上多一层每帧变换就掉帧）。
 *
 * `public/js/motion.js` 里有同一条查询给静态页用，改一处要改两处。
 */
export const DESKTOP = "(min-width: 1024px) and (pointer: fine)";

/**
 * 动效总开关。任何动效代码开跑之前先问这一句。
 *
 * 服务端渲染阶段一律返回 false —— 首屏必须是「动效还没跑」的那个完整状态。
 */
export function motionAllowed(): boolean {
  return typeof window !== "undefined" && !window.matchMedia(REDUCED_MOTION).matches;
}

/** 只在桌面跑的那类动效（遮罩视差）用这个。 */
export function desktopMotionAllowed(): boolean {
  return motionAllowed() && window.matchMedia(DESKTOP).matches;
}
