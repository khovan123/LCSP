"use client";

import { resolveMessage } from "@lcsp/i18n";
import { useEffect, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";

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
  elementRef?: Ref<HTMLDivElement>;
};

export function AssessmentTranscript({
  children,
  autoScrollKey,
  ariaLabel = t("pages.appShell.chatTranscriptLabel"),
  className,
}: AssessmentTranscriptProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    scrollToLatest(viewport);
  }, [autoScrollKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const rail = railRef.current;
    if (!viewport || !rail || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => scrollToLatest(viewport));
    observer.observe(viewport);
    observer.observe(rail);
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
        "no-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto",
        className,
      )}
    >
      <ChatRail
        elementRef={railRef}
        className="shrink-0 gap-4 pt-6 pb-4"
      >
        {children}
      </ChatRail>
    </div>
  );
}

export function ChatRail({ children, className, elementRef }: ChatRailProps) {
  return (
    <div
      ref={elementRef}
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
  if (viewport.scrollHeight <= viewport.clientHeight) {
    return;
  }
  viewport.scrollTo({
    top: viewport.scrollHeight,
    behavior: "auto",
  });
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
