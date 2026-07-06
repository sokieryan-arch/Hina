import assert from "node:assert/strict";
import test from "node:test";
import { formatAuthErrorMessage, isPopupFallbackError } from "./authErrorMessage";

test("formatAuthErrorMessage explains unauthorized preview domains", () => {
  assert.equal(
    formatAuthErrorMessage({ code: "auth/unauthorized-domain" }),
    "当前预览域名没有加入 Firebase 授权域名。请使用 http://localhost 打开，或在 Firebase Authentication 里添加这个域名。",
  );
});

test("formatAuthErrorMessage explains disabled Google provider", () => {
  assert.equal(
    formatAuthErrorMessage({ code: "auth/operation-not-allowed" }),
    "这个 Firebase 项目还没有开启对应的登录方式。",
  );
});

test("formatAuthErrorMessage explains common email password failures", () => {
  assert.equal(formatAuthErrorMessage({ code: "auth/email-already-in-use" }), "这个邮箱已经注册过了。");
  assert.equal(formatAuthErrorMessage({ code: "auth/invalid-credential" }), "邮箱或密码不正确。");
  assert.equal(formatAuthErrorMessage({ code: "auth/weak-password" }), "密码至少需要 8 位。");
});

test("isPopupFallbackError only flags errors that can use redirect sign-in", () => {
  assert.equal(isPopupFallbackError({ code: "auth/popup-blocked" }), true);
  assert.equal(isPopupFallbackError({ code: "auth/web-storage-unsupported" }), true);
  assert.equal(isPopupFallbackError({ code: "auth/popup-closed-by-user" }), false);
});
