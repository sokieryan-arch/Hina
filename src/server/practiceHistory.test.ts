import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryPracticeHistoryStore, readPracticeHistoryRecord, readPracticeSkill } from "./practiceHistory";

function record(id: string, createdAt = 100) {
  return readPracticeHistoryRecord({ id, skill: "reading", createdAt, attempt: { id, skill: "reading", createdAt, estimatedBand: 6 } });
}

test("practice history validator rejects mismatched metadata", () => {
  assert.throws(() => readPracticeHistoryRecord({ id: "r1", skill: "reading", createdAt: 100, attempt: { id: "different", skill: "reading", createdAt: 100, estimatedBand: 6 } }), /does not match/);
  assert.throws(() => readPracticeSkill("dance"), /Invalid practice skill/);
});

test("memory practice history is isolated by user and supports skill deletion", async () => {
  const store = createMemoryPracticeHistoryStore();
  await store.upsert("one", record("r1"));
  await store.upsert("two", record("r2"));
  assert.deepEqual((await store.list("one")).map((item) => item.id), ["r1"]);
  await store.remove("one", "reading");
  assert.deepEqual(await store.list("one"), []);
  assert.equal((await store.list("two")).length, 1);
});
