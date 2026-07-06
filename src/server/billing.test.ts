import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBillingSummary,
  canUseChat,
  createMemoryBillingStore,
  getUsageDate,
  readBillingLimits,
} from "./billing";

test("readBillingLimits uses free 30 and unlimited Pro by default", () => {
  const limits = readBillingLimits({});

  assert.equal(limits.freeDailyLimit, 30);
  assert.equal(limits.proDailyLimit, null);
});

test("buildBillingSummary reports free usage, remaining quota, and reset", () => {
  const now = new Date("2026-07-06T08:30:00.000Z");
  const summary = buildBillingSummary({
    plan: "free",
    usedToday: 4,
    now,
    limits: { freeDailyLimit: 30, proDailyLimit: null },
  });

  assert.equal(summary.plan, "free");
  assert.equal(summary.isPro, false);
  assert.equal(summary.dailyLimit, 30);
  assert.equal(summary.usedToday, 4);
  assert.equal(summary.remainingToday, 26);
  assert.equal(summary.resetAt, "2026-07-07T00:00:00.000Z");
  assert.equal(canUseChat(summary), true);
});

test("buildBillingSummary treats Pro limit 0 as unlimited", () => {
  const summary = buildBillingSummary({
    plan: "pro",
    usedToday: 99,
    now: new Date("2026-07-06T08:30:00.000Z"),
    limits: { freeDailyLimit: 30, proDailyLimit: null },
  });

  assert.equal(summary.isPro, true);
  assert.equal(summary.dailyLimit, null);
  assert.equal(summary.remainingToday, null);
  assert.equal(canUseChat(summary), true);
});

test("memory billing store increments usage and resets by UTC day", async () => {
  const store = createMemoryBillingStore({ freeDailyLimit: 2, proDailyLimit: null });
  const userId = "user-1";
  const dayOne = new Date("2026-07-06T23:30:00.000Z");
  const dayTwo = new Date("2026-07-07T00:05:00.000Z");

  assert.equal(getUsageDate(dayOne), "2026-07-06");
  assert.equal(getUsageDate(dayTwo), "2026-07-07");

  const initial = await store.getBillingSummary(userId, dayOne);
  assert.equal(initial.usedToday, 0);
  assert.equal(initial.remainingToday, 2);

  const afterOne = await store.incrementChatUsage(userId, dayOne);
  assert.equal(afterOne.usedToday, 1);
  assert.equal(afterOne.remainingToday, 1);

  const afterTwo = await store.incrementChatUsage(userId, dayOne);
  assert.equal(afterTwo.usedToday, 2);
  assert.equal(afterTwo.remainingToday, 0);
  assert.equal(canUseChat(afterTwo), false);

  const nextDay = await store.getBillingSummary(userId, dayTwo);
  assert.equal(nextDay.usedToday, 0);
  assert.equal(nextDay.remainingToday, 2);
});
