"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import { LEGAL_RULE_LIFECYCLE_STATUSES } from "@lcsp/contracts/legal-rule-catalog";
import { LCSPLogo } from "@/components/atoms/lcsp-logo";
import {
  LCSP_LOGO_VARIANTS,
  LCSP_LOGO_SIZES,
} from "@/components/types/lcsp-logo.types";
import {
  ADMIN_READINESS_STATUSES,
  ADMIN_USER_STATUSES,
  type AdminUser,
  type AdminCorpusVersion,
} from "../../types/admin.types";

const INITIAL_USERS: AdminUser[] = [
  {
    id: "admin-1",
    email: "admin1@example.com",
    role: AUTH_USER_ROLES.admin,
    status: ADMIN_USER_STATUSES.active,
    isLastAdmin: true,
  },
  {
    id: "customer-1",
    email: "customer1@example.com",
    role: AUTH_USER_ROLES.customer,
    status: ADMIN_USER_STATUSES.active,
  },
];

const INITIAL_CORPUS: AdminCorpusVersion[] = [
  {
    id: "corpus-1",
    version: "v2026.09.01",
    readiness: ADMIN_READINESS_STATUSES.ready,
    status: LEGAL_RULE_LIFECYCLE_STATUSES.draft,
  },
  {
    id: "corpus-2",
    version: "v2026.09.02-draft",
    readiness: ADMIN_READINESS_STATUSES.blocked,
    status: LEGAL_RULE_LIFECYCLE_STATUSES.draft,
  },
];

export function AdminShell() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [locale, setLocale] = React.useState<"en" | "vi">("en");
  const [users, setUsers] = React.useState<AdminUser[]>(INITIAL_USERS);
  const [corpusList, setCorpusList] =
    React.useState<AdminCorpusVersion[]>(INITIAL_CORPUS);

  // Dialog states
  const [suspendTarget, setSuspendTarget] =
    React.useState<AdminUser | null>(null);
  const [publishTarget, setPublishTarget] =
    React.useState<AdminCorpusVersion | null>(null);
  const [discardTarget, setDiscardTarget] =
    React.useState<AdminCorpusVersion | null>(null);

  // Escape key listener for open modals
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSuspendTarget(null);
        setPublishTarget(null);
        setDiscardTarget(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const handleToggleLocale = () => {
    setLocale((prev) => (prev === "en" ? "vi" : "en"));
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTarget) return;
    try {
      await fetch(`/api/admin/users/${suspendTarget.id}/suspend`, {
        method: "POST",
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === suspendTarget.id
            ? { ...u, status: ADMIN_USER_STATUSES.suspended }
            : u,
        ),
      );
    } finally {
      setSuspendTarget(null);
    }
  };

  const handleConfirmPublish = async () => {
    if (!publishTarget) return;
    try {
      await fetch(`/api/admin/corpus/${publishTarget.id}/publish`, {
        method: "POST",
      });
      setCorpusList((prev) =>
        prev.map((c) =>
          c.id === publishTarget.id
            ? { ...c, status: LEGAL_RULE_LIFECYCLE_STATUSES.approved }
            : c,
        ),
      );
    } finally {
      setPublishTarget(null);
    }
  };

  const handleConfirmDiscard = async () => {
    if (!discardTarget) return;
    try {
      await fetch(`/api/admin/corpus/${discardTarget.id}/discard`, {
        method: "POST",
      });
      setCorpusList((prev) => prev.filter((c) => c.id !== discardTarget.id));
    } finally {
      setDiscardTarget(null);
    }
  };

  const handleExportAudit = async () => {
    await fetch("/api/admin/audit/export", { method: "POST" });
  };

  return (
    <div className="flex w-full min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* 248px Figma Sidebar */}
      <aside
        data-testid="admin-sidebar"
        className="w-62 min-w-62 max-w-62 border-r border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-6"
      >
        <div data-testid="admin-brand-lockup">
          <LCSPLogo
            variant={LCSP_LOGO_VARIANTS.lockup}
            size={LCSP_LOGO_SIZES.md}
          />
        </div>
        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
            {locale === "en" ? "Overview" : "Tổng quan"}
          </button>
          <button className="flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
            {locale === "en" ? "User Accounts" : "Tài khoản"}
          </button>
          <button className="flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
            {locale === "en" ? "Corpus Versions" : "Phiên bản Corpus"}
          </button>
          <button className="flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
            {locale === "en" ? "Audit Logs" : "Nhật ký kiểm toán"}
          </button>
        </nav>
        <div className="mt-auto flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            id="theme-toggle"
            data-testid="theme-toggle"
            onClick={handleToggleTheme}
            className="rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"
          >
            Theme:{" "}
            <span id="theme-label">{mounted ? theme || "light" : "light"}</span>
          </button>
          <button
            id="lang-toggle"
            data-testid="lang-toggle"
            onClick={handleToggleLocale}
            className="rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"
          >
            Lang: <span id="lang-label">{locale}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        data-testid="admin-main-content"
        className="flex-1 p-8 overflow-y-auto"
      >
        <header className="mb-8">
          <h1
            id="page-title"
            data-testid="page-title"
            className="text-2xl font-bold"
          >
            {locale === "en" ? "Admin Dashboard" : "Bảng điều khiển quản trị"}
          </h1>
          <p
            id="page-subtitle"
            data-testid="page-subtitle"
            className="text-sm text-slate-500"
          >
            {locale === "en"
              ? "Manage workspace security, users, and legal corpus."
              : "Quản lý bảo mật workspace, người dùng và kho dữ liệu pháp lý."}
          </p>
        </header>

        {/* Users Section */}
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold">
            {locale === "en" ? "User Management" : "Quản lý người dùng"}
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  data-testid={`user-row-${u.id}`}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-3">{u.email}</td>
                  <td className="py-3">{u.role}</td>
                  <td className="py-3">{u.status}</td>
                  <td className="py-3 flex gap-2">
                    {u.isLastAdmin && (
                      <button
                        data-testid={`demote-btn-${u.id}`}
                        disabled
                        title="Cannot demote the last admin"
                        className="rounded bg-slate-100 px-3 py-1 text-xs text-slate-400 dark:bg-slate-800"
                      >
                        Demote
                      </button>
                    )}
                    <button
                      data-testid={`suspend-btn-${u.id}`}
                      onClick={() => setSuspendTarget(u)}
                      className="rounded bg-rose-50 px-3 py-1 text-xs text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400"
                    >
                      Suspend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Corpus Section */}
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold">
            {locale === "en"
              ? "Legal Corpus Versions"
              : "Phiên bản Corpus pháp lý"}
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pb-3">Version</th>
                <th className="pb-3">Readiness</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {corpusList.map((c) => (
                <tr
                  key={c.id}
                  data-testid={`corpus-row-${c.id}`}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-3">{c.version}</td>
                  <td className="py-3">
                    <span
                      data-testid={
                        c.readiness === ADMIN_READINESS_STATUSES.ready
                          ? "readiness-badge-draft"
                          : "readiness-badge-blocked"
                      }
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        c.readiness === ADMIN_READINESS_STATUSES.ready
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {c.readiness}
                    </span>
                  </td>
                  <td className="py-3 flex gap-2">
                    {c.readiness === ADMIN_READINESS_STATUSES.ready ? (
                      <button
                        data-testid="publish-corpus-btn"
                        onClick={() => setPublishTarget(c)}
                        className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        data-testid="publish-blocked-btn"
                        disabled
                        className="rounded bg-slate-100 px-3 py-1 text-xs text-slate-400 dark:bg-slate-800"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      data-testid="discard-corpus-btn"
                      onClick={() => setDiscardTarget(c)}
                      className="rounded bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      Discard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Audit Section */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold">
            {locale === "en" ? "Audit Trail" : "Nhật ký kiểm toán"}
          </h2>
          <button
            data-testid="export-audit-btn"
            id="export-audit-action"
            onClick={handleExportAudit}
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            {locale === "en" ? "Export Audit Trail" : "Xuất nhật ký kiểm toán"}
          </button>
        </section>
      </main>

      {/* Modals */}
      {suspendTarget && (
        <div
          data-testid="suspend-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSuspendTarget(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold">Suspend User Account</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to suspend {suspendTarget.email}? Active
              sessions will be immediately invalidated.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                data-testid="cancel-suspend-btn"
                onClick={() => setSuspendTarget(null)}
                className="rounded border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-suspend-btn"
                onClick={handleConfirmSuspend}
                className="rounded bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {publishTarget && (
        <div
          data-testid="publish-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPublishTarget(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold">Publish Corpus Version</h3>
            <p className="mt-2 text-sm text-slate-500">
              Publishing {publishTarget.version} will make it the single
              authoritative ACTIVE version.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                data-testid="cancel-publish-btn"
                onClick={() => setPublishTarget(null)}
                className="rounded border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-publish-btn"
                onClick={handleConfirmPublish}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Confirm Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {discardTarget && (
        <div
          data-testid="discard-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiscardTarget(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold">Discard Draft Corpus</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to discard {discardTarget.version}? This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                data-testid="cancel-discard-btn"
                onClick={() => setDiscardTarget(null)}
                className="rounded border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-discard-btn"
                onClick={handleConfirmDiscard}
                className="rounded bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
              >
                Confirm Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
