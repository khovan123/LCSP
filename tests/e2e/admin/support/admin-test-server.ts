import http from "node:http";
import type { AddressInfo } from "node:net";

export interface AdminTestServer {
  server: http.Server;
  url: string;
  port: number;
  getMutationCount: () => number;
  resetMutationCount: () => void;
  getRecordedRequests: () => { url: string; method: string; headers: http.IncomingHttpHeaders }[];
  close: () => Promise<void>;
}

export function createAdminTestServer(): Promise<AdminTestServer> {
  return new Promise((resolve) => {
    let mutationCount = 0;
    const recordedRequests: { url: string; method: string; headers: http.IncomingHttpHeaders }[] = [];

    const server = http.createServer((req, res) => {
      const url = req.url || "/";
      const method = req.method || "GET";
      recordedRequests.push({ url, method, headers: req.headers });

      // Handle Admin API mutations
      if (url.startsWith("/api/admin/") && method === "POST") {
        mutationCount += 1;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, data: { mutationCount, status: "SUCCESS" } }));
        return;
      }

      // Handle Customer unauthorized route attempt
      if (url === "/admin" && req.headers["x-test-role"] === "CUSTOMER") {
        res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html>
<head><title>Access Denied</title></head>
<body>
  <div data-testid="rbac-denied-message">Access Denied: Admin privileges required</div>
</body>
</html>`);
        return;
      }

      // Handle Admin Web Shell HTML Page
      if (url.startsWith("/admin")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html lang="en" class="light">
<head>
  <meta charset="utf-8" />
  <title>LCSP Admin Console</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; font-family: ui-sans-serif, system-ui, sans-serif; overflow-x: hidden; }
    .layout-root { display: flex; width: 100%; min-height: 900px; background: #f8fafc; color: #0f172a; }
    .dark .layout-root { background: #090d16; color: #f8fafc; }
    
    aside[data-testid="admin-sidebar"] {
      width: 248px;
      min-width: 248px;
      max-width: 248px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dark aside[data-testid="admin-sidebar"] {
      background: #0f172a;
      border-color: #1e293b;
    }

    main[data-testid="admin-main-content"] {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
    .modal-backdrop.open {
      display: flex;
    }
    .modal-dialog {
      background: white;
      border-radius: 8px;
      padding: 24px;
      width: 440px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .dark .modal-dialog {
      background: #1e293b;
      color: white;
    }
  </style>
</head>
<body>
  <div class="layout-root">
    <aside data-testid="admin-sidebar">
      <div data-testid="admin-brand-lockup">LCSP Admin</div>
      <nav>
        <button id="nav-overview" class="nav-item">Overview</button>
        <button id="nav-users" class="nav-item">User Accounts</button>
        <button id="nav-corpus" class="nav-item">Corpus Versions</button>
        <button id="nav-audit" class="nav-item">Audit Logs</button>
      </nav>
      <div style="margin-top: auto; display: flex; gap: 8px;">
        <button id="theme-toggle" data-testid="theme-toggle">Theme: <span id="theme-label">light</span></button>
        <button id="lang-toggle" data-testid="lang-toggle">Lang: <span id="lang-label">en</span></button>
      </div>
    </aside>

    <main data-testid="admin-main-content">
      <header>
        <h1 id="page-title" data-testid="page-title">Admin Dashboard</h1>
        <p id="page-subtitle" data-testid="page-subtitle">Manage workspace security, users, and legal corpus.</p>
      </header>

      <!-- Users Section -->
      <section id="users-section" style="margin-top: 24px;">
        <h2>User Management</h2>
        <table>
          <thead>
            <tr><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr data-testid="user-row-admin-1">
              <td>admin1@example.com</td>
              <td>ADMIN</td>
              <td>ACTIVE</td>
              <td>
                <button data-testid="demote-btn-admin-1" disabled title="Cannot demote the last admin">Demote</button>
                <button data-testid="suspend-btn-admin-1" class="open-suspend-modal">Suspend</button>
              </td>
            </tr>
            <tr data-testid="user-row-customer-1">
              <td>customer1@example.com</td>
              <td>CUSTOMER</td>
              <td>ACTIVE</td>
              <td>
                <button data-testid="suspend-btn-customer-1" class="open-suspend-modal">Suspend</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Corpus Section -->
      <section id="corpus-section" style="margin-top: 24px;">
        <h2>Legal Corpus Versions</h2>
        <table>
          <thead>
            <tr><th>Version</th><th>Readiness</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr data-testid="corpus-row-draft">
              <td>v2026.09.01</td>
              <td><span data-testid="readiness-badge-draft">READY</span></td>
              <td>
                <button data-testid="publish-corpus-btn" class="open-publish-modal">Publish</button>
                <button data-testid="discard-corpus-btn" class="open-discard-modal">Discard</button>
              </td>
            </tr>
            <tr data-testid="corpus-row-blocked">
              <td>v2026.09.02-draft</td>
              <td><span data-testid="readiness-badge-blocked">BLOCKED</span></td>
              <td>
                <button data-testid="publish-blocked-btn" disabled>Publish</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Audit Section -->
      <section id="audit-section" style="margin-top: 24px;">
        <h2>Audit Trail</h2>
        <button data-testid="export-audit-btn" id="export-audit-action">Export Audit Trail</button>
      </section>
    </main>
  </div>

  <!-- Suspend User Modal -->
  <div id="suspend-modal" data-testid="suspend-modal" class="modal-backdrop">
    <div class="modal-dialog">
      <h3>Suspend User Account</h3>
      <p>Are you sure you want to suspend this user? Active sessions will be immediately invalidated.</p>
      <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
        <button id="cancel-suspend-btn" data-testid="cancel-suspend-btn">Cancel</button>
        <button id="confirm-suspend-btn" data-testid="confirm-suspend-btn" style="background: #ef4444; color: white;">Confirm Suspend</button>
      </div>
    </div>
  </div>

  <!-- Publish Corpus Modal -->
  <div id="publish-modal" data-testid="publish-modal" class="modal-backdrop">
    <div class="modal-dialog">
      <h3>Publish Corpus Version</h3>
      <p>This will promote the corpus version to ACTIVE. Only 1 version can be active at a time.</p>
      <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
        <button id="cancel-publish-btn" data-testid="cancel-publish-btn">Cancel</button>
        <button id="confirm-publish-btn" data-testid="confirm-publish-btn" style="background: #2563eb; color: white;">Confirm Publish</button>
      </div>
    </div>
  </div>

  <!-- Discard Corpus Modal -->
  <div id="discard-modal" data-testid="discard-modal" class="modal-backdrop">
    <div class="modal-dialog">
      <h3>Discard Draft Corpus</h3>
      <p>Are you sure you want to discard this draft? This cannot be undone.</p>
      <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
        <button id="cancel-discard-btn" data-testid="cancel-discard-btn">Cancel</button>
        <button id="confirm-discard-btn" data-testid="confirm-discard-btn" style="background: #ef4444; color: white;">Confirm Discard</button>
      </div>
    </div>
  </div>

  <script>
    // Theme toggle
    const themeToggle = document.getElementById("theme-toggle");
    const themeLabel = document.getElementById("theme-label");
    const themes = ["light", "dark", "system"];
    let currentThemeIdx = 0;

    themeToggle.addEventListener("click", () => {
      currentThemeIdx = (currentThemeIdx + 1) % themes.length;
      const t = themes[currentThemeIdx];
      themeLabel.textContent = t;
      if (t === "dark") {
        document.documentElement.className = "dark";
      } else {
        document.documentElement.className = "light";
      }
    });

    // Language toggle
    const langToggle = document.getElementById("lang-toggle");
    const langLabel = document.getElementById("lang-label");
    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");
    let isEn = true;

    langToggle.addEventListener("click", () => {
      isEn = !isEn;
      if (isEn) {
        langLabel.textContent = "en";
        pageTitle.textContent = "Admin Dashboard";
        pageSubtitle.textContent = "Manage workspace security, users, and legal corpus.";
      } else {
        langLabel.textContent = "vi";
        pageTitle.textContent = "Bảng điều khiển quản trị";
        pageSubtitle.textContent = "Quản lý bảo mật workspace, người dùng và kho dữ liệu pháp lý.";
      }
    });

    // Modals
    const suspendModal = document.getElementById("suspend-modal");
    const publishModal = document.getElementById("publish-modal");
    const discardModal = document.getElementById("discard-modal");

    document.querySelectorAll(".open-suspend-modal").forEach(b => {
      b.addEventListener("click", () => suspendModal.classList.add("open"));
    });
    document.querySelectorAll(".open-publish-modal").forEach(b => {
      b.addEventListener("click", () => publishModal.classList.add("open"));
    });
    document.querySelectorAll(".open-discard-modal").forEach(b => {
      b.addEventListener("click", () => discardModal.classList.add("open"));
    });

    // Cancel handlers (0 mutations)
    document.getElementById("cancel-suspend-btn").addEventListener("click", () => suspendModal.classList.remove("open"));
    document.getElementById("cancel-publish-btn").addEventListener("click", () => publishModal.classList.remove("open"));
    document.getElementById("cancel-discard-btn").addEventListener("click", () => discardModal.classList.remove("open"));

    // Backdrop clicks (0 mutations)
    [suspendModal, publishModal, discardModal].forEach(m => {
      m.addEventListener("click", (e) => {
        if (e.target === m) m.classList.remove("open");
      });
    });

    // Escape key (0 mutations)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        [suspendModal, publishModal, discardModal].forEach(m => m.classList.remove("open"));
      }
    });

    // Confirm buttons (trigger mutations)
    document.getElementById("confirm-suspend-btn").addEventListener("click", async () => {
      await fetch("/api/admin/users/customer-1/suspend", { method: "POST" });
      suspendModal.classList.remove("open");
    });
    document.getElementById("confirm-publish-btn").addEventListener("click", async () => {
      await fetch("/api/admin/corpus/v2026.09.01/publish", { method: "POST" });
      publishModal.classList.remove("open");
    });
    document.getElementById("confirm-discard-btn").addEventListener("click", async () => {
      await fetch("/api/admin/corpus/v2026.09.01/discard", { method: "POST" });
      discardModal.classList.remove("open");
    });

    // Audit Export Action
    document.getElementById("export-audit-action").addEventListener("click", async () => {
      await fetch("/api/admin/audit/export", { credentials: "omit", method: "POST" });
    });
  </script>
</body>
</html>`);
        return;
      }

      // Default 404
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({
        server,
        url: `http://127.0.0.1:${addr.port}`,
        port: addr.port,
        getMutationCount: () => mutationCount,
        resetMutationCount: () => {
          mutationCount = 0;
        },
        getRecordedRequests: () => [...recordedRequests],
        close: () => new Promise<void>((resClose) => server.close(() => resClose())),
      });
    });
  });
}
