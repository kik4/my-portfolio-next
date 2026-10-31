"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import "./AnimateOnScroll.css";

type AnimateOnScrollProps = {
  children: ReactNode;
  threshold?: number;
  delay?: number;
  className?: string;
  animation?: "fadeIn" | "slideUp" | "slideLeft" | "slideRight" | "scale";
};

const animationClasses = {
  fadeIn: "aos-fade-in",
  slideUp: "aos-slide-up",
  slideLeft: "aos-slide-left",
  slideRight: "aos-slide-right",
  scale: "aos-scale",
} as const;

export const AnimateOnScroll = ({
  children,
  threshold = 0.1,
  delay = 0,
  className = "",
  animation = "fadeIn",
}: AnimateOnScrollProps) => {
  // 初期値を表示状態にして、JS なしでも内容が見えるようにする。
  // hydration 後に画面外と分かった要素だけ、画面に入るまで隠す
  const [ref, inView] = useInView({
    threshold,
    triggerOnce: true,
    initialInView: true,
  });

  return (
    <div
      ref={ref}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
      className={clsx(
        "aos",
        animationClasses[animation],
        !inView && "aos-waiting",
        className,
      )}
    >
      {children}
    </div>
  );
};
