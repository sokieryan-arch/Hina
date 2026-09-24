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
    displayLanguage: "en",
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
    displayLanguage: "en",
  }));

  assert.match(markup, /🎒 Hina&#x27;s Wishlist/);
  assert.match(markup, /Back/);
});

test("app header follows the target language", () => {
  const markup = renderToStaticMarkup(React.createElement(AppHeader, {
    view: "notes",
    theme: "light",
    presence: "online",
    isSpeaking: false,
    onOpenSpace: () => {},
    onBack: () => {},
    onOpenSettings: () => {},
    displayLanguage: "zh-CN",
  }));

  assert.match(markup, /Hina 的学习卡片/);
  assert.match(markup, /返回/);
});

test("app header supports Portuguese", () => {
  const notesMarkup = renderToStaticMarkup(React.createElement(AppHeader, {
    view: "notes",
    theme: "light",
    presence: "reading",
    isSpeaking: false,
    onOpenSpace: () => {},
    onBack: () => {},
    onOpenSettings: () => {},
    displayLanguage: "pt",
  }));
  const chatMarkup = renderToStaticMarkup(React.createElement(AppHeader, {
    view: "chat",
    theme: "light",
    presence: "reading",
    isSpeaking: false,
    onOpenSpace: () => {},
    onBack: () => {},
    onOpenSettings: () => {},
    displayLanguage: "pt",
  }));

  assert.match(notesMarkup, /Estudos da Hina/);
  assert.match(notesMarkup, /Voltar/);
  assert.match(chatMarkup, /Lendo/);
});

test("app header names the speaking practice view", () => {
  const markup = renderToStaticMarkup(React.createElement(AppHeader, {
    view: "practice",
    theme: "light",
    presence: "online",
    isSpeaking: false,
    onOpenSpace: () => {},
    onBack: () => {},
    onOpenSettings: () => {},
    displayLanguage: "en",
  }));

  assert.match(markup, /🎯 Hina&#x27;s Practice/);
});
