import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPublicPage, PublicPage, PUBLIC_PAGE_LINKS } from "./publicPages";

test("public Paddle verification pages are routable", () => {
  assert.equal(getPublicPage("/pricing")?.key, "pricing");
  assert.equal(getPublicPage("/terms")?.key, "terms");
  assert.equal(getPublicPage("/privacy")?.key, "privacy");
  assert.equal(getPublicPage("/refunds")?.key, "refunds");
  assert.equal(getPublicPage("/chat"), null);
});

test("pricing page explains the product, price, and policy links", () => {
  const page = getPublicPage("/pricing");
  assert.ok(page);
  const markup = renderToStaticMarkup(React.createElement(PublicPage, { page }));

  assert.match(markup, /Hina Pro/);
  assert.match(markup, /US\$4\.99 USD per month/);
  assert.match(markup, /30 free chats per day/);
  assert.match(markup, /Taxes may apply and will be calculated at checkout/);
  assert.match(markup, /No free trial, introductory discount, or promotional price is currently offered/);
  assert.match(markup, /renews monthly at US\$4\.99 USD per month/);
  assert.match(markup, /Terms of Service/);
  assert.match(markup, /Privacy Policy/);
  assert.match(markup, /Refund Policy/);
});

test("terms, privacy, and refund pages include support contact and required topics", () => {
  for (const path of ["/terms", "/privacy", "/refunds"]) {
    const page = getPublicPage(path);
    assert.ok(page);
    const markup = renderToStaticMarkup(React.createElement(PublicPage, { page }));

    assert.match(markup, /sokieryan@gmail\.com/);
    assert.match(markup, /Hina/);
    assert.doesNotMatch(markup, /planned as a monthly subscription|once enabled|checkout is enabled/);
  }

  assert.match(renderToStaticMarkup(React.createElement(PublicPage, { page: getPublicPage("/privacy")! })), /Firebase/);
  assert.match(renderToStaticMarkup(React.createElement(PublicPage, { page: getPublicPage("/refunds")! })), /14 days/);
});

test("footer links expose all public policy pages", () => {
  assert.deepEqual(PUBLIC_PAGE_LINKS.map((link) => link.href), ["/pricing", "/terms", "/privacy", "/refunds"]);
});
