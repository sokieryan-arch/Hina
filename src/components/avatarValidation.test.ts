import test from "node:test";
import assert from "node:assert/strict";
import { MAX_AVATAR_BYTES, validateAvatarFile } from "./avatarValidation";

test("validateAvatarFile accepts supported image types under the size limit", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
    const file = new File([new Uint8Array([1, 2, 3])], "avatar", { type });
    assert.equal(validateAvatarFile(file), null);
  }
});

test("validateAvatarFile rejects unsupported file types", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "avatar.txt", { type: "text/plain" });

  assert.deepEqual(validateAvatarFile(file), {
    code: "avatar_type_not_supported",
    message: "Choose a JPG, PNG, WebP, or GIF image.",
  });
});

test("validateAvatarFile rejects images over 10MB", () => {
  const file = new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], "avatar.png", { type: "image/png" });

  assert.deepEqual(validateAvatarFile(file), {
    code: "avatar_too_large",
    message: "Avatar must be 10MB or smaller.",
  });
});
