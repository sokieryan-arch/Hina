import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HinaSpace } from "./HinaSpace";
import type { Message, WishlistItem } from "../types";

const messages: Message[] = [
  { id: "m1", role: "model", text: "Hi", timestamp: Date.now() - 86_400_000, type: "response" },
  { id: "m2", role: "model", text: "Use day, not today.", timestamp: Date.now(), type: "correction" },
  { id: "m3", role: "model", text: "Low-key means quietly.", timestamp: Date.now(), type: "insight" },
  { id: "m4", role: "model", text: "Try the phrase I'm all ears.", timestamp: Date.now(), type: "insight", tipKind: "expression" },
];

const wishlist: WishlistItem[] = [{
  id: "w1",
  kind: "goal",
  title: "30-day streak",
  details: "Tiny daily practice",
  progress: 40,
  completed: false,
  targetDate: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}];

test("HinaSpace renders the four main sections", () => {
  const markup = renderToStaticMarkup(React.createElement(HinaSpace, {
    view: "space",
    messages,
    wishlistItems: wishlist,
    onNavigate: () => {},
    onWishlistItemsChange: () => {},
  }));

  assert.match(markup, /Moments/);
  assert.match(markup, /📸/);
  assert.match(markup, /Study/);
  assert.match(markup, /✍️/);
  assert.match(markup, /Wishlist/);
  assert.match(markup, /🎒/);
  assert.match(markup, /Relationship/);
  assert.match(markup, /❤️/);
});

test("HinaSpace study view derives notes and category tabs from chat messages", () => {
  const markup = renderToStaticMarkup(React.createElement(HinaSpace, {
    view: "notes",
    messages,
    wishlistItems: wishlist,
    onNavigate: () => {},
    onWishlistItemsChange: () => {},
  }));

  assert.match(markup, /Use day, not today/);
  assert.match(markup, /Low-key means quietly/);
  assert.match(markup, /All/);
  assert.match(markup, /Grammar/);
  assert.match(markup, /Vocabulary/);
  assert.match(markup, /Expressions/);
  assert.match(markup, /Culture/);
  assert.match(markup, /grammar/);
  assert.match(markup, /vocabulary/);
  assert.match(markup, /expression/);
});

test("HinaSpace relationship view summarizes chat and list history", () => {
  const markup = renderToStaticMarkup(React.createElement(HinaSpace, {
    view: "relationship",
    messages,
    wishlistItems: wishlist,
    onNavigate: () => {},
    onWishlistItemsChange: () => {},
  }));

  assert.match(markup, /Messages/);
  assert.match(markup, /Study notes/);
  assert.match(markup, /List items/);
});
