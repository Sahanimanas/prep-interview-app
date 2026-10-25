"use client";

import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade/slide a block in when it mounts (or scrolls into view with `inView`). */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  inView = false,
  className,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  inView?: boolean;
  className?: string;
} & Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "whileInView">) {
  const target = { opacity: 1, y: 0 };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      {...(inView ? { whileInView: target, viewport: { once: true, margin: "-60px" } } : { animate: target })}
      transition={{ duration: 0.5, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const staggerChild = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Container whose <StaggerItem> children animate in one after another. */
export function Stagger({
  children,
  className,
  as = "div",
  inView = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
  inView?: boolean;
}) {
  const Component = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  return (
    <Component
      className={className}
      variants={staggerParent}
      initial="hidden"
      {...(inView ? { whileInView: "show", viewport: { once: true, margin: "-60px" } } : { animate: "show" })}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component className={className} variants={staggerChild}>
      {children}
    </Component>
  );
}

/** Lifts and subtly tilts toward the pointer on hover (disabled for touch/reduced motion by MotionConfig). */
export function TiltCard({
  children,
  className,
  maxTilt = 5,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), { stiffness: 200, damping: 20 });

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  }

  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <div className="pp-perspective h-full">
      <motion.div
        className={cn("h-full", className)}
        style={{ rotateX, rotateY }}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        {children}
      </motion.div>
    </div>
  );
}
