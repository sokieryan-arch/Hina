import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("browser tab title uses the Hina brand", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Hina<\/title>/);
  assert.doesNotMatch(html, /My Google AI Studio App/);
});

test("homepage exposes crawlable pricing and policy links", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /US\$4\.99 USD per month/);
  assert.match(html, /href="\/pricing"/);
  assert.match(html, /href="\/terms"/);
  assert.match(html, /href="\/privacy"/);
  assert.match(html, /href="\/refunds"/);
});
