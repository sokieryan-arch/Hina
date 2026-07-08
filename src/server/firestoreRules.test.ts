import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Firestore message rules allow proactive messages to persist", () => {
  const source = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const typeValidation = source.match(/\(data\.type == 'response'[\s\S]+?\)/)?.[0] || "";

  assert.match(typeValidation, /data\.type == 'proactive'/);
});
