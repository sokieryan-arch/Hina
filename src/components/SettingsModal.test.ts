import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsModal } from "./SettingsModal";
import type { BillingSummary, ProactiveSettings, UserProfile } from "../types";

const user = {
  uid: "user-1",
  displayName: "Sokie",
  photoURL: null,
} as any;

const profile: UserProfile = {
  displayName: "Sokie",
  photoURL: null,
};

const billing: BillingSummary = {
  plan: "free",
  isPro: false,
  dailyLimit: 30,
  usedToday: 4,
  remainingToday: 26,
  resetAt: new Date("2026-07-07T00:00:00.000Z").toISOString(),
};

const proactiveSettings: ProactiveSettings = {
  enabled: true,
  minHoursBetweenNudges: 20,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  favoriteTopics: ["films", "food"],
};

function renderSettings() {
  return renderToStaticMarkup(React.createElement(SettingsModal, {
    isOpen: true,
    onClose: () => {},
    user,
    profile,
    billing,
    onProfileChange: () => {},
    onBillingChange: () => {},
    onClearHistory: () => {},
    proactiveSettings,
    onProactiveSettingsChange: () => {},
  }));
}

test("settings modal renders profile upload controls and Pro usage", () => {
  const markup = renderSettings();

  assert.match(markup, /Display Name/);
  assert.match(markup, /Upload Avatar/);
  assert.match(markup, /JPG, PNG, WebP, GIF under 10MB/);
  assert.match(markup, /Free Plan/);
  assert.match(markup, /4\/30 chats used today/);
  assert.match(markup, /Upgrade/);
});

test("settings modal keeps coffee QR codes tucked behind payment choices", () => {
  const markup = renderSettings();

  assert.match(markup, /Buy Hina a cup of coffee/);
  assert.match(markup, /server hosting and maintenance/);
  assert.match(markup, /Choose WeChat or Alipay to reveal a QR code/);
  assert.match(markup, /WeChat/);
  assert.match(markup, /Alipay/);
  assert.doesNotMatch(markup, /\/support\/wechat-coffee\.png/);
  assert.doesNotMatch(markup, /\/support\/alipay-coffee\.jpg/);
});
