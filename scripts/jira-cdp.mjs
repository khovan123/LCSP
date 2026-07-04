#!/usr/bin/env node

const CDP_BASE = process.env.CDP_BASE_URL || "http://127.0.0.1:9222";

async function fetchJson(path) {
  const response = await fetch(`${CDP_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

class CdpPage {
  constructor(target) {
    this.target = target;
    this.id = 0;
    this.pending = new Map();
    this.ws = null;
  }

  async connect() {
    this.ws = new WebSocket(this.target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("WebSocket timeout")), 10000);
      this.ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      this.ws.onerror = (event) => {
        clearTimeout(timeout);
        reject(event.error || new Error("WebSocket error"));
      };
    });
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) {
        return;
      }
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
      } else {
        resolve(message.result);
      }
    };
    await this.send("Runtime.enable");
    await this.send("Page.enable");
    await this.send("Input.setIgnoreInputEvents", { ignore: false });
  }

  async close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, options = {}) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      ...options,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Evaluation failed");
    }
    return result.result?.value;
  }
}

function print(value) {
  if (typeof value === "string") {
    console.log(value);
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.error(
    [
      "Usage:",
      "  jira-cdp.mjs list",
      "  jira-cdp.mjs inspect <url-fragment>",
      "  jira-cdp.mjs click-testid <url-fragment> <testid>",
      "  jira-cdp.mjs click-text <url-fragment> <button-text>",
      "  jira-cdp.mjs set-input <url-fragment> <selector> <value>",
      "  jira-cdp.mjs press-key <url-fragment> <key>",
      "  jira-cdp.mjs add-any-incoming <url-fragment> <status-cell-testid> <transition-name>",
      "  jira-cdp.mjs eval <url-fragment> <expression>",
    ].join("\n"),
  );
  process.exit(1);
}

async function getPage(fragment) {
  const pages = await fetchJson("/json/list");
  const target = pages.find((page) => page.type === "page" && page.url.includes(fragment));
  if (!target) {
    throw new Error(`No page matched fragment: ${fragment}`);
  }
  const client = new CdpPage(target);
  await client.connect();
  return client;
}

async function listPages() {
  const pages = await fetchJson("/json/list");
  print(
    pages.map((page) => ({
      id: page.id,
      title: page.title,
      type: page.type,
      url: page.url,
    })),
  );
}

async function inspect(fragment) {
  const page = await getPage(fragment);
  try {
    const snapshot = await page.evaluate(`(() => ({
      title: document.title,
      url: location.href,
      h1: document.querySelector("h1")?.innerText || null,
      headings: Array.from(document.querySelectorAll("h1,h2,h3")).slice(0, 20).map((el) => el.innerText),
      buttons: Array.from(document.querySelectorAll("button")).slice(0, 40).map((el) => el.innerText.trim()).filter(Boolean),
      inputs: Array.from(document.querySelectorAll("input,textarea,select")).slice(0, 30).map((el) => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        aria: el.getAttribute("aria-label"),
        placeholder: el.getAttribute("placeholder"),
        value: el.value || "",
      })),
      testIds: Array.from(document.querySelectorAll("[data-testid]")).slice(0, 80).map((el) => el.getAttribute("data-testid")),
      bodyStart: document.body?.innerText?.slice(0, 4000) || "",
    }))()`);
    print(snapshot);
  } finally {
    await page.close();
  }
}

async function clickByExpression(fragment, expression) {
  const page = await getPage(fragment);
  try {
    const result = await page.evaluate(expression);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const snapshot = await page.evaluate(`(() => ({
      title: document.title,
      url: location.href,
      active: document.activeElement?.outerHTML?.slice(0, 400) || null,
      headings: Array.from(document.querySelectorAll("h1,h2,h3")).slice(0, 20).map((el) => el.innerText),
      inputs: Array.from(document.querySelectorAll("input,textarea,select")).slice(0, 30).map((el) => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        aria: el.getAttribute("aria-label"),
        placeholder: el.getAttribute("placeholder"),
        value: el.value || "",
      })),
      bodyStart: document.body?.innerText?.slice(0, 4000) || "",
    }))()`);
    print({ result, snapshot });
  } finally {
    await page.close();
  }
}

async function clickTestId(fragment, testId) {
  await clickByExpression(
    fragment,
    `(() => {
      const el = document.querySelector('[data-testid=${JSON.stringify(testId)}]');
      if (!el) return { clicked: false, reason: "not-found" };
      el.click();
      return { clicked: true, testId: ${JSON.stringify(testId)} };
    })()`,
  );
}

async function clickText(fragment, text) {
  await clickByExpression(
    fragment,
    `(() => {
      const wanted = ${JSON.stringify(text)};
      const el = Array.from(document.querySelectorAll("button,a,[role=button]"))
        .find((node) => node.innerText.trim() === wanted);
      if (!el) return { clicked: false, reason: "not-found" };
      el.click();
      return { clicked: true, text: wanted };
    })()`,
  );
}

async function evalOnPage(fragment, expression) {
  const page = await getPage(fragment);
  try {
    const result = await page.evaluate(expression);
    print(result);
  } finally {
    await page.close();
  }
}

async function setInput(fragment, selector, value) {
  const page = await getPage(fragment);
  try {
    const result = await page.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, reason: "not-found" };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
        || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) {
        setter.call(el, ${JSON.stringify(value)});
      } else {
        el.value = ${JSON.stringify(value)};
      }
      el.focus();
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, value: el.value, tag: el.tagName };
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 800));
    print(result);
  } finally {
    await page.close();
  }
}

async function pressKey(fragment, key) {
  const page = await getPage(fragment);
  try {
    const text = key.length === 1 ? key : undefined;
    await page.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      text,
      unmodifiedText: text,
    });
    await page.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const snapshot = await page.evaluate(`(() => ({
      active: document.activeElement?.outerHTML?.slice(0, 400) || null,
      bodyStart: document.body?.innerText?.slice(0, 3000) || "",
    }))()`);
    print(snapshot);
  } finally {
    await page.close();
  }
}

async function addAnyIncoming(fragment, statusCellTestId, transitionName) {
  const page = await getPage(fragment);
  try {
    await page.evaluate(`(() => {
      const el = document.querySelector('[data-testid=${JSON.stringify(statusCellTestId)}]');
      if (!el) throw new Error('status-cell-not-found');
      el.click();
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 700));

    await page.evaluate(`(() => {
      const el = Array.from(document.querySelectorAll('button,a,[role=button]'))
        .find((node) => node.innerText.trim() === "Create incoming transition");
      if (!el) throw new Error('incoming-transition-button-not-found');
      el.click();
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 700));

    await page.evaluate(`(() => {
      const input = document.querySelector("[data-testid='modal-dialog'] input[role='combobox']");
      if (!input) throw new Error('from-status-input-not-found');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter ? setter.call(input, "Any Status") : (input.value = "Any Status");
      input.focus();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 400));

    await page.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      text: "\r",
      unmodifiedText: "\r",
    });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter" });
    await new Promise((resolve) => setTimeout(resolve, 500));

    await page.evaluate(`(() => {
      const input = document.querySelector("[data-testid='workflow-editor.transition-name']");
      if (!input) throw new Error('transition-name-input-not-found');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter ? setter.call(input, ${JSON.stringify(transitionName)}) : (input.value = ${JSON.stringify(transitionName)});
      input.focus();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 400));

    await page.evaluate(`(() => {
      const button = document.querySelector("[data-testid='workflow-editor.submit']");
      if (!button) throw new Error('create-transition-submit-not-found');
      button.click();
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const snapshot = await page.evaluate(`(() => ({
      title: document.title,
      url: location.href,
      bodyStart: document.body?.innerText?.slice(0, 4000) || "",
    }))()`);
    print({ ok: true, transitionName, snapshot });
  } finally {
    await page.close();
  }
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (!command) {
    usage();
  }

  if (command === "list") {
    await listPages();
    return;
  }
  if (command === "inspect" && args.length >= 1) {
    await inspect(args[0]);
    return;
  }
  if (command === "click-testid" && args.length >= 2) {
    await clickTestId(args[0], args[1]);
    return;
  }
  if (command === "click-text" && args.length >= 2) {
    await clickText(args[0], args.slice(1).join(" "));
    return;
  }
  if (command === "set-input" && args.length >= 3) {
    await setInput(args[0], args[1], args.slice(2).join(" "));
    return;
  }
  if (command === "press-key" && args.length >= 2) {
    await pressKey(args[0], args[1]);
    return;
  }
  if (command === "add-any-incoming" && args.length >= 3) {
    await addAnyIncoming(args[0], args[1], args.slice(2).join(" "));
    return;
  }
  if (command === "eval" && args.length >= 2) {
    await evalOnPage(args[0], args.slice(1).join(" "));
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
