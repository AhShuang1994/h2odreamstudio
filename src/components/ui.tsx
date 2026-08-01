import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

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

/** 剩下的属性透传给 <p> —— 动效挂载点（data-reveal）就是这么加上去的。 */
export function Eyebrow({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & ComponentPropsWithoutRef<"p">) {
  return (
    <p
      {...rest}
      className={`text-xs font-medium tracking-[0.16em] text-accent ${className}`}
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

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
  external,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-hover"
      : "border border-hairline-strong text-ink hover:border-ink-muted hover:bg-surface-1";
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
