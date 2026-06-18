export const themes = [
  { value: "standard", label: "Standard", borderColor: "rgba(148, 163, 184, 0.25)", textColor: "rgb(226, 232, 240)" },
  { value: "canada", label: "Canada energy", borderColor: "rgba(248, 113, 113, 0.25)", textColor: "rgb(254, 226, 226)" },
  { value: "usa", label: "USA lights", borderColor: "rgba(96, 165, 250, 0.25)", textColor: "rgb(219, 234, 254)" },
  { value: "mexico", label: "Mexico spirit", borderColor: "rgba(74, 222, 128, 0.25)", textColor: "rgb(220, 252, 231)" },
] as const;

export type ThemeName = (typeof themes)[number]["value"];

export const THEME_MASCOTS: Record<ThemeName, string | null> = {
  standard: null,
  canada: "/mascots/Maple.webp",
  usa: "/mascots/Clutch.webp",
  mexico: "/mascots/Zayu.webp",
};

export const THEME_STORAGE_KEY = "selected-theme";
export const THEME_CHANGE_EVENT = "selected-theme-change";

export function isThemeName(value: string | null): value is ThemeName {
  return value !== null && themes.some((option) => option.value === value);
}

export function getThemeSnapshot(): ThemeName {
  if (typeof window === "undefined") {
    return "standard";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(savedTheme) ? savedTheme : "standard";
}

export function getThemeServerSnapshot(): ThemeName {
  return "standard";
}

export function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleThemeChange = () => callback();

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  window.addEventListener("storage", handleThemeChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleThemeChange);
  };
}

export function persistTheme(theme: ThemeName) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
