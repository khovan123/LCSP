"use client";

import { useRef, useSyncExternalStore } from "react";
import type { LocaleProviderProps } from "@/components/types/provider.types";
import {
  getAppLocaleSnapshot,
  initAppLocale,
  subscribeToAppLocale,
} from "@/lib/locale";

export function LocaleProvider({
  children,
  initialLocale,
}: LocaleProviderProps) {
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initAppLocale(initialLocale);
    initializedRef.current = true;
  }

  const currentLocale = useSyncExternalStore(
    subscribeToAppLocale,
    getAppLocaleSnapshot,
    getAppLocaleSnapshot,
  );

  return (
    <div data-locale={currentLocale} className="contents">
      {children}
    </div>
  );
}
