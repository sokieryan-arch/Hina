import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  extractPaddleBillingUpdate,
  readPaddleServerConfig,
  verifyPaddleWebhookSignature,
} from "./paddle";

function signatureHeader(secret: string, body: string, timestamp = 1783425600) {
  const h1 = createHmac("sha256", secret)
    .update(`${timestamp}:${body}`)
    .digest("hex");
  return `ts=${timestamp};h1=${h1}`;
}

test("readPaddleServerConfig uses the Hina Pro price and explicit secrets", () => {
  const config = readPaddleServerConfig({
    PADDLE_WEBHOOK_SECRET: "pdl_ntfset_secret",
  });

  assert.equal(config.priceId, "pri_01kwxsfc7hyn0b94ptrtf7y2ek");
  assert.equal(config.webhookSecret, "pdl_ntfset_secret");
});

test("verifyPaddleWebhookSignature accepts valid HMAC signatures", () => {
  const body = JSON.stringify({ event_type: "transaction.paid" });
  const header = signatureHeader("secret", body);

  assert.equal(
    verifyPaddleWebhookSignature(Buffer.from(body), header, "secret", new Date("2026-07-07T12:00:00.000Z")),
    true,
  );
  assert.equal(
    verifyPaddleWebhookSignature(Buffer.from(body), header, "wrong-secret", new Date("2026-07-07T12:00:00.000Z")),
    false,
  );
});

test("extractPaddleBillingUpdate unlocks Pro only for paid Hina Pro events", () => {
  const update = extractPaddleBillingUpdate({
    event_type: "transaction.paid",
    data: {
      custom_data: {
        uid: "user-1",
        priceId: "pri_01kwxsfc7hyn0b94ptrtf7y2ek",
      },
      details: {
        line_items: [
          { price_id: "pri_01kwxsfc7hyn0b94ptrtf7y2ek" },
        ],
      },
    },
  }, "pri_01kwxsfc7hyn0b94ptrtf7y2ek");

  assert.deepEqual(update, { subjectId: "uid:user-1", plan: "pro" });

  assert.equal(extractPaddleBillingUpdate({
    event_type: "transaction.paid",
    data: {
      custom_data: { uid: "user-1" },
      details: { line_items: [{ price_id: "pri_other" }] },
    },
  }, "pri_01kwxsfc7hyn0b94ptrtf7y2ek"), null);
});

test("extractPaddleBillingUpdate downgrades canceled subscriptions", () => {
  const update = extractPaddleBillingUpdate({
    event_type: "subscription.canceled",
    data: {
      custom_data: {
        billingSubject: "uid:user-1",
      },
      items: [
        { price: { id: "pri_01kwxsfc7hyn0b94ptrtf7y2ek" } },
      ],
    },
  }, "pri_01kwxsfc7hyn0b94ptrtf7y2ek");

  assert.deepEqual(update, { subjectId: "uid:user-1", plan: "free" });
});
