// hooks/usePageTitle.ts
"use client";
import { useEffect } from "react";
import { APP_NAME } from "@/lib/appName";

export function usePageTitle(subtitle?: string) {
  useEffect(() => {
    document.title = subtitle?.trim()
      ? `${APP_NAME} — ${subtitle.trim()}`
      : APP_NAME;
  }, [subtitle]);
}
