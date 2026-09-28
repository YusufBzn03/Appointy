"use client";

import * as React from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

type AnimatedCounterProps = {
  value: number;
  suffix?: string;
  decimals?: number;
};

export function AnimatedCounter({ value, suffix = "", decimals = 0 }: AnimatedCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 24, stiffness: 90 });
  const [display, setDisplay] = React.useState("0");

  React.useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  React.useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setDisplay(latest.toFixed(decimals));
    });
    return unsubscribe;
  }, [spring, decimals]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
