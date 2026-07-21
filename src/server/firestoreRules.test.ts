import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Firestore message rules allow proactive messages to persist", () => {
  const source = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const typeValidation = source.match(/\(data\.type == 'response'[\s\S]+?\)/)?.[0] || "";

  assert.match(typeValidation, /data\.type == 'proactive'/);
});

test("Firestore rules allow five proactive topics and owner wishlist Space data", () => {
  const source = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");

  assert.match(source, /data\.favoriteTopics\.size\(\) <= 5/);
  assert.match(source, /match \/space\/wishlist/);
  assert.match(source, /isValidWishlist\(incoming\(\)\)/);
});
