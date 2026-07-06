import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthPanel, validateAuthForm } from "./AuthPanel";

const noop = async () => {};

test("auth panel renders English account entry with Google instead of WeChat", () => {
  const markup = renderToStaticMarkup(React.createElement(AuthPanel, {
    onGoogleLogin: noop,
    onEmailLogin: noop,
    onEmailRegister: noop,
    onPasswordReset: noop,
  }));

  assert.match(markup, /Sign in/);
  assert.match(markup, /Create account/);
  assert.match(markup, /Forgot password/);
  assert.match(markup, /Email/);
  assert.match(markup, /Continue with Google/);
  assert.doesNotMatch(markup, /Made for mobile/);
  assert.doesNotMatch(markup, /international edition keeps Firebase Auth/i);
  assert.doesNotMatch(markup, /登录|注册|忘记密码|邮箱|适合手机/);
  assert.doesNotMatch(markup, /微信/);
  assert.doesNotMatch(markup, /WeChat/);
});

test("auth panel exposes public pricing and policy links", () => {
  const markup = renderToStaticMarkup(React.createElement(AuthPanel, {
    onGoogleLogin: noop,
    onEmailLogin: noop,
    onEmailRegister: noop,
    onPasswordReset: noop,
  }));

  assert.match(markup, /href="\/pricing"/);
  assert.match(markup, /href="\/terms"/);
  assert.match(markup, /href="\/privacy"/);
  assert.match(markup, /href="\/refunds"/);
});

test("validateAuthForm protects email, password, and display name requirements", () => {
  assert.equal(validateAuthForm("login", { email: "bad", password: "12345678" }), "Please enter a valid email address.");
  assert.equal(validateAuthForm("login", { email: "hina@example.com", password: "" }), "Please enter your password.");
  assert.equal(validateAuthForm("register", { email: "hina@example.com", password: "12345", displayName: "Hina" }), "Password must be at least 8 characters.");
  assert.equal(validateAuthForm("register", { email: "hina@example.com", password: "12345678", displayName: "" }), "Please choose a display name.");
  assert.equal(validateAuthForm("reset", { email: "hina@example.com" }), null);
});
