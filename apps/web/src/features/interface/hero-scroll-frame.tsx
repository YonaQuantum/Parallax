"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export function HeroScrollFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    const sync = () => {
      const frame = frameRef.current;
      if (!frame) {
        return;
      }

      const progress = Math.min(1, Math.max(0, window.scrollY / 520));
      frame.style.setProperty("--hero-progress", progress.toFixed(4));
    };

    const requestSync = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
    };
  }, []);

  return (
    <div className="ap-home-motion" ref={frameRef}>
      {children}
    </div>
  );
}
