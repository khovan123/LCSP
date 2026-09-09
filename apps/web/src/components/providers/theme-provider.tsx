"use client";

import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from "next-themes";
import { useEffect } from "react";

function ThemeKeyboardShortcut() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === "d" &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        !event.repeat
      ) {
        event.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeKeyboardShortcut />
      {children}
    </NextThemesProvider>
  );
}

