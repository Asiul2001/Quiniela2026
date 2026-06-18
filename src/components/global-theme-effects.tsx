"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeToTheme,
} from "@/lib/theme";

export function GlobalThemeEffects() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
