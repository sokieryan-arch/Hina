import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Vercel API entry imports the server with a runtime-resolvable extension", () => {
  const source = readFileSync(new URL("../../api/index.ts", import.meta.url), "utf8");
  assert.match(source, /from\s+["']\.\.\/server\.js["']/);
  assert.doesNotMatch(source, /from\s+["']\.\.\/server["']/);
});

test("Vercel server entry does not statically import JSON config", () => {
  const source = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /firebase-applet-config\.json/);
});
