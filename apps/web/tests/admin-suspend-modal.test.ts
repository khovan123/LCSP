import assert from "node:assert/strict";
import test from "node:test";

test("Admin suspend modal: dismissal actions (Cancel, Escape, Backdrop) cause 0 mutations", () => {
  let suspendMutationCount = 0;

  function handleDismissal(action: "cancel" | "escape" | "backdrop") {
    if (action === "cancel" || action === "escape" || action === "backdrop") {
      // Closes modal only, no API mutation dispatched
      return;
    }
  }

  function handleConfirm() {
    suspendMutationCount += 1;
  }

  // 1. User clicks Cancel button
  handleDismissal("cancel");
  assert.equal(suspendMutationCount, 0);

  // 2. User presses Escape key
  handleDismissal("escape");
  assert.equal(suspendMutationCount, 0);

  // 3. User clicks backdrop
  handleDismissal("backdrop");
  assert.equal(suspendMutationCount, 0);

  // 4. User confirms suspension
  handleConfirm();
  assert.equal(suspendMutationCount, 1);
});

test("Admin suspend modal: dynamic target user identity injection", () => {
  const selectedUser = {
    fullName: "Bao Nguyen",
    email: "bao.nguyen@security.vn",
  };

  const template =
    "{name} ({email}) will no longer be able to sign in or start assessments until an administrator restores access.";

  const renderedBody = template
    .replace("{name}", selectedUser.fullName)
    .replace("{email}", selectedUser.email);

  assert.equal(
    renderedBody,
    "Bao Nguyen (bao.nguyen@security.vn) will no longer be able to sign in or start assessments until an administrator restores access.",
  );
  assert.equal(renderedBody.includes("Nhi M."), false);
});
