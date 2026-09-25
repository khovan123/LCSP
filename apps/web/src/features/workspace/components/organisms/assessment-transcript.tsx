"use client";

import { resolveMessage } from "@lcsp/i18n";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import { appLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

import type { AssessmentTranscriptAutoScrollKey } from "../../types/assessment-chat.types";

type AssessmentTranscriptProps = {
  children: ReactNode;
  autoScrollKey?: AssessmentTranscriptAutoScrollKey;
  ariaLabel?: string;
  className?: string;
};

type ChatRailProps = {
  children: ReactNode;
  className?: string;
};

export function AssessmentTranscript({
  children,
  autoScrollKey,
  ariaLabel = t("pages.appShell.chatTranscriptLabel"),
  className,
}: AssessmentTranscriptProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (autoScrollKey === undefined) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    scrollToLatest(viewport);
  }, [autoScrollKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => scrollToLatest(viewport));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={viewportRef}
      data-slot="assessment-transcript"
      role="log"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto",
        className,
      )}
    >
      <ChatRail className="min-h-full justify-end gap-4 pt-6 pb-3">
        {children}
      </ChatRail>
    </div>
  );
}

export function ChatRail({ children, className }: ChatRailProps) {
  return (
    <div
      data-slot="chat-rail"
      className={cn(
        "mx-auto flex w-full max-w-170 min-w-0 flex-col px-4 sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function scrollToLatest(viewport: HTMLDivElement) {
  viewport.scrollTo({
    top: viewport.scrollHeight,
    behavior: "auto",
  });
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
