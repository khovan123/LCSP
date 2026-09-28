"use client";

import { useState, useSyncExternalStore } from "react";
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
  useState(() => {
    initAppLocale(initialLocale);
  });

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
