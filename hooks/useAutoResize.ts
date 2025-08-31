"use client";
import { useEffect } from "react";

export function useAutoResize(ref: React.RefObject<HTMLTextAreaElement>, value: string, max = 164) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [ref, value, max]);
}
