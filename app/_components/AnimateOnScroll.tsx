"use client";

import { motion, useAnimation } from "framer-motion";
import { type ReactNode, useEffect } from "react";
import { useInView } from "react-intersection-observer";

type AnimateOnScrollProps = {
  children: ReactNode;
  threshold?: number;
  delay?: number;
  className?: string;
  animation?: "fadeIn" | "slideUp" | "slideLeft" | "slideRight" | "scale";
};

export const AnimateOnScroll = ({
  children,
  threshold = 0.1,
  delay = 0,
  className = "",
  animation = "fadeIn",
}: AnimateOnScrollProps) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold });

  // アニメーションのバリエーション
  const animations = {
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.6, delay } },
    },
    slideUp: {
      hidden: { opacity: 0, y: 50 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6,
          delay,
          type: "spring",
          stiffness: 100,
        },
      },
    },
    slideLeft: {
      hidden: { opacity: 0, x: 50 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: 0.6,
          delay,
          type: "spring",
          stiffness: 100,
        },
      },
    },
    slideRight: {
      hidden: { opacity: 0, x: -50 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: 0.6,
          delay,
          type: "spring",
          stiffness: 100,
        },
      },
    },
    scale: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.6,
          delay,
          type: "spring",
          stiffness: 100,
        },
      },
    },
  } as const;

  const selectedAnimation = animations[animation];

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={selectedAnimation}
      className={className}
    >
      {children}
    </motion.div>
  );
};
