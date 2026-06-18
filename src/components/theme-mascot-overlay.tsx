"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeToTheme,
  THEME_MASCOTS,
} from "@/lib/theme";

export function ThemeMascotOverlay() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const mascot = THEME_MASCOTS[theme];

  if (!mascot) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <Image
        src={mascot}
        alt=""
        aria-hidden="true"
        width={650}
        height={650}
        priority
        className="fixed left-[-8px] top-24 w-[260px] sm:left-[-140px] sm:top-[-10px] sm:w-[650px]"
        style={{
          height: "auto",
          opacity: 0.72,
          filter: "drop-shadow(0 0 40px rgba(0,0,0,0.35))",
        }}
      />
    </div>
  );
}
