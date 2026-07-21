import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader";

test("app header shows ambient presence and Hina Space entry", () => {
  const markup = renderToStaticMarkup(React.createElement(AppHeader, {
    view: "chat",
    theme: "light",
    presence: "reading",
    isSpeaking: false,
    onOpenSpace: () => {},
    onBack: () => {},
    onOpenSettings: () => {},
  }));

  assert.match(markup, /Open Hina&#x27;s Space/);
  assert.match(markup, /📚 Reading/);
  assert.match(markup, /Hina/);
  assert.doesNotMatch(markup, /Logout|Toggle theme/);
});

test("app header renders a back title for Space views", () => {
  const markup = renderToStaticMarkup(React.createElement(AppHeader, {
    view: "wishlist",
    theme: "dark",
    presence: "online",
    isSpeaking: false,
    onOpenSpace: () => {},
    onBack: () => {},
    onOpenSettings: () => {},
  }));

  assert.match(markup, /🎒 Hina&#x27;s Wishlist/);
  assert.match(markup, /Back/);
});
