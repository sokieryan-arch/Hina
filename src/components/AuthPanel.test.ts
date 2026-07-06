import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthPanel, validateAuthForm } from "./AuthPanel";

const noop = async () => {};

test("auth panel renders Chinese account entry with Google instead of WeChat", () => {
  const markup = renderToStaticMarkup(React.createElement(AuthPanel, {
    onGoogleLogin: noop,
    onEmailLogin: noop,
    onEmailRegister: noop,
    onPasswordReset: noop,
  }));

  assert.match(markup, /登录/);
  assert.match(markup, /注册/);
  assert.match(markup, /忘记密码/);
  assert.match(markup, /邮箱/);
  assert.match(markup, /使用 Google 登录/);
  assert.match(markup, /适合手机/);
  assert.doesNotMatch(markup, /微信/);
  assert.doesNotMatch(markup, /WeChat/);
});

test("validateAuthForm protects email, password, and display name requirements", () => {
  assert.equal(validateAuthForm("login", { email: "bad", password: "12345678" }), "请输入正确的邮箱地址。");
  assert.equal(validateAuthForm("login", { email: "hina@example.com", password: "" }), "请输入密码。");
  assert.equal(validateAuthForm("register", { email: "hina@example.com", password: "12345", displayName: "Hina" }), "密码至少需要 8 位。");
  assert.equal(validateAuthForm("register", { email: "hina@example.com", password: "12345678", displayName: "" }), "请给自己起一个昵称。");
  assert.equal(validateAuthForm("reset", { email: "hina@example.com" }), null);
});
