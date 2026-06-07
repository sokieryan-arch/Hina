import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProactivePrompt,
  normalizeProactiveSettings,
  shouldCreateProactiveNudge,
} from "./proactive";

test("normalizeProactiveSettings keeps nudges opt-in and validates quiet hours", () => {
  assert.deepEqual(normalizeProactiveSettings({}), {
    enabled: false,
    minHoursBetweenNudges: 20,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    favoriteTopics: [],
  });

  assert.deepEqual(normalizeProactiveSettings({
    enabled: true,
    minHoursBetweenNudges: 2,
    quietHoursStart: "25:00",
    quietHoursEnd: "07:30",
    favoriteTopics: ["films", "philosophy", "tiny subway mysteries", "extra"],
  }), {
    enabled: true,
    minHoursBetweenNudges: 6,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:30",
    favoriteTopics: ["films", "philosophy", "tiny subway mysteries"],
  });
});

test("shouldCreateProactiveNudge respects opt-in, recent activity, and quiet hours", () => {
  const settings = normalizeProactiveSettings({
    enabled: true,
    minHoursBetweenNudges: 12,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  });

  assert.equal(shouldCreateProactiveNudge(settings, {
    now: new Date("2026-06-08T10:00:00+08:00"),
    lastInteractionAt: new Date("2026-06-07T18:00:00+08:00"),
  }), true);

  assert.equal(shouldCreateProactiveNudge(settings, {
    now: new Date("2026-06-08T23:00:00+08:00"),
    lastInteractionAt: new Date("2026-06-07T18:00:00+08:00"),
  }), false);

  assert.equal(shouldCreateProactiveNudge(settings, {
    now: new Date("2026-06-08T10:00:00+08:00"),
    lastInteractionAt: new Date("2026-06-08T09:00:00+08:00"),
  }), false);
});

test("buildProactivePrompt asks for a topicful Hina opener without pretending to be a notification system", () => {
  const prompt = buildProactivePrompt({
    localDate: "2026-06-08",
    favoriteTopics: ["films", "food"],
    recentMessages: ["I am preparing for IELTS.", "I like New York stories."],
  });

  assert.match(prompt, /Hina/i);
  assert.match(prompt, /films/);
  assert.match(prompt, /IELTS/);
  assert.doesNotMatch(prompt, /push token/i);
});
