"use client";

import { useEffect, useRef } from "react";
import { AlertCircleIcon, ShieldAlertIcon } from "lucide-react";
import type { MessageKey } from "@lcsp/i18n";

import { Button } from "@/components/ui/button";
import { resolveAppMessage } from "@/lib/i18n";
import type { AdminSuspendModalProps } from "../../types/admin.types";

export function AdminSuspendModal({
  isOpen,
  user,
  onClose,
  onConfirm,
  isPending = false,
}: AdminSuspendModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const eyebrow = resolveAppMessage(
    "pages.admin.suspendModal.eyebrow" as MessageKey,
  );
  const title = resolveAppMessage(
    "pages.admin.suspendModal.title" as MessageKey,
  );
  const auditNote = resolveAppMessage(
    "pages.admin.suspendModal.auditNote" as MessageKey,
  );
  const cancelLabel = resolveAppMessage(
    "pages.admin.suspendModal.cancel" as MessageKey,
  );
  const confirmLabel = resolveAppMessage(
    "pages.admin.suspendModal.confirmSuspend" as MessageKey,
  );
  const suspendingLabel = resolveAppMessage(
    "pages.admin.suspendModal.suspending" as MessageKey,
  );

  // Dynamic template replacement for body text
  const rawBody = resolveAppMessage(
    "pages.admin.suspendModal.body" as MessageKey,
  );
  const formattedBody = rawBody
    .replace("{name}", user.fullName)
    .replace("{email}", user.email);

  // Manage focus: capture previous active element, set initial focus, trap focus, and restore on dismiss
  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const focusable = Array.from(focusableElements);
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        // Backdrop click closes dialog without mutation
        if (e.target === e.currentTarget && !isPending) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspend-dialog-title"
      aria-describedby="suspend-dialog-description"
    >
      <div
        ref={modalRef}
        className="flex w-full max-w-[520px] flex-col space-y-4 rounded-[14px] border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Eyebrow & Title */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
            <ShieldAlertIcon className="size-3.5 text-amber-500 dark:text-amber-400" />
            {eyebrow}
          </div>
          <h2
            id="suspend-dialog-title"
            className="text-[20px] font-semibold text-foreground"
          >
            {title}
          </h2>
        </div>

        {/* Dynamic Body */}
        <p
          id="suspend-dialog-description"
          className="text-[12.5px] text-muted-foreground leading-relaxed"
        >
          {formattedBody}
        </p>

        {/* Audit Note */}
        <div className="flex h-[50px] items-center gap-2.5 rounded-[10px] border border-border bg-muted/40 px-3.5 py-2.5 text-[11.5px] font-medium text-muted-foreground">
          <AlertCircleIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="leading-snug">{auditNote}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="h-[38px] w-[108px] rounded-[10px] border-border bg-secondary text-[12.5px] font-medium text-secondary-foreground hover:bg-secondary/80 shadow-xs"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="h-[38px] w-[164px] rounded-[10px] bg-primary text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs disabled:opacity-50"
          >
            {isPending ? suspendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
