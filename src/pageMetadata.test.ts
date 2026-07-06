import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("browser tab title uses the Hina brand", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Hina<\/title>/);
  assert.doesNotMatch(html, /My Google AI Studio App/);
});
