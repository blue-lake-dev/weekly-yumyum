"use client";

import { useState, useEffect, useRef, type RefObject } from "react";

/**
 * Returns a ref to attach to a placeholder element and a boolean
 * that becomes `true` once the element enters the viewport.
 * Once triggered, it stays `true` (no unmount on scroll away).
 */
export function useInViewMount(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  return [ref, inView];
}
