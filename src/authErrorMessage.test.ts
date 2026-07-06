import assert from "node:assert/strict";
import test from "node:test";
import { formatAuthErrorMessage, isPopupFallbackError } from "./authErrorMessage";

test("formatAuthErrorMessage explains unauthorized preview domains", () => {
  assert.equal(
    formatAuthErrorMessage({ code: "auth/unauthorized-domain" }),
    "This preview domain is not authorized in Firebase. Open the preview with http://localhost or add this domain in Firebase Authentication.",
  );
});

test("formatAuthErrorMessage explains disabled Google provider", () => {
  assert.equal(
    formatAuthErrorMessage({ code: "auth/operation-not-allowed" }),
    "Google sign-in is not enabled for this Firebase project yet.",
  );
});

test("isPopupFallbackError only flags errors that can use redirect sign-in", () => {
  assert.equal(isPopupFallbackError({ code: "auth/popup-blocked" }), true);
  assert.equal(isPopupFallbackError({ code: "auth/web-storage-unsupported" }), true);
  assert.equal(isPopupFallbackError({ code: "auth/popup-closed-by-user" }), false);
});
