import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicRoot = new URL("../public/", import.meta.url);

test("static Paddle verification pages include crawlable policy content", () => {
  const pricing = readFileSync(new URL("pricing.html", publicRoot), "utf8");
  const terms = readFileSync(new URL("terms.html", publicRoot), "utf8");
  const privacy = readFileSync(new URL("privacy.html", publicRoot), "utf8");
  const refunds = readFileSync(new URL("refunds.html", publicRoot), "utf8");

  assert.match(pricing, /Hina Pro/);
  assert.match(pricing, /US\$4\.99/);
  assert.match(terms, /Terms of Service/);
  assert.match(terms, /sokieryan@gmail\.com/);
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /Firebase/);
  assert.match(refunds, /Refund Policy/);
  assert.match(refunds, /14 days/);
});

test("Vercel clean policy URLs rewrite to static HTML documents", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const rewrites = config.rewrites as Array<{ source: string; destination: string }>;

  assert.deepEqual(
    rewrites.slice(1, 5),
    [
      { source: "/pricing", destination: "/pricing.html" },
      { source: "/terms", destination: "/terms.html" },
      { source: "/privacy", destination: "/privacy.html" },
      { source: "/refunds", destination: "/refunds.html" },
    ],
  );
});
