import Link from "next/link";
import type { ReactNode } from "react";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

/**
 * 区块眉标。
 *
 * 字距是**正的、很小的**一点点 —— 与标题的负字距形成对比，把眉标标成
 * 「分类标签」而不是小标题。重画前是 0.16em 的大字距，那是通用代理商味。
 */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      data-reveal
      className={`text-[13px] font-medium tracking-[0.03em] text-accent ${className}`}
    >
      {children}
    </p>
  );
}

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  external?: boolean;
};

/**
 * 8px 圆角，不是胶囊 —— 胶囊按钮是模板味最重的一处。
 * 主按钮是全站唯一大面积用 accent 的地方（hero 的液态球体除外）。
 */
export function Button({
  href,
  children,
  variant = "primary",
  className = "",
  external,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium " +
    "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-accent";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-hover active:bg-accent-press"
      : "border border-hairline-strong bg-surface-1 text-ink hover:bg-surface-2";
  const cls = `${base} ${styles} ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/**
 * 液态球体的预留位（#90 只留位，素材归 #67）。
 *
 * 按 ADR-0007，服务区 2 处与联系区 1 处要出**靛紫版**球体 —— 现行素材是
 * hero 那版多彩的，不能直接搬过来。这里先把位置、尺寸与合成方式定死：
 *
 * - 绝对定位、`aria-hidden`，**版面完全不依赖它** —— 现在是空的，版面照常成立
 * - `mix-blend-screen` 是现行站合成球体的方式，素材是黑底、无 alpha 通道
 * - #67 交付后往里放一张 `<img>` 即可，位置与尺寸不用再谈
 *
 * `data-orb-slot` 是给人搜的：`grep -r data-orb-slot src/` 能一次找齐三处。
 */
export function OrbSlot({ id, className }: { id: string; className: string }) {
  return (
    <div
      aria-hidden
      data-orb-slot={id}
      className={`pointer-events-none absolute isolate mix-blend-screen ${className}`}
    />
  );
}
