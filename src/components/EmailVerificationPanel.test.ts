import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmailVerificationPanel } from "./EmailVerificationPanel";

const noop = async () => {};

test("email verification panel asks password users to verify before chat", () => {
  const markup = renderToStaticMarkup(React.createElement(EmailVerificationPanel, {
    email: "hina@example.com",
    feedback: null,
    onRefresh: noop,
    onResend: noop,
    onSignOut: noop,
  }));

  assert.match(markup, /Check your email/);
  assert.match(markup, /hina@example.com/);
  assert.match(markup, /I have verified, refresh/);
  assert.match(markup, /Resend verification email/);
  assert.match(markup, /Sign out/);
});
