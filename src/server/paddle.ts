import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingPlan } from "./billing";

export const HINA_PRO_PRICE_ID = "pri_01kwxsfc7hyn0b94ptrtf7y2ek";

export interface PaddleServerConfig {
  priceId: string;
  webhookSecret: string | null;
}

export interface PaddleBillingUpdate {
  subjectId: string;
  plan: BillingPlan;
}

export function readPaddleServerConfig(env: Record<string, string | undefined> = process.env): PaddleServerConfig {
  return {
    priceId: (env.PADDLE_PRICE_ID || env.VITE_PADDLE_PRICE_ID || HINA_PRO_PRICE_ID).trim(),
    webhookSecret: env.PADDLE_WEBHOOK_SECRET?.trim() || null,
  };
}

function parseSignatureHeader(header: string | undefined) {
  if (!header) return null;
  const parts = new Map(
    header.split(";")
      .map((part) => part.trim().split("="))
      .filter((part): part is [string, string] => part.length === 2 && Boolean(part[0] && part[1])),
  );
  return {
    timestamp: parts.get("ts") || null,
    signatures: [...parts.entries()]
      .filter(([key]) => key.startsWith("h"))
      .map(([, value]) => value),
  };
}

export function verifyPaddleWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string | null,
  now = new Date(),
  toleranceSeconds = 300,
) {
  if (!secret) return false;
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed?.timestamp || parsed.signatures.length === 0) return false;

  const timestampSeconds = Number.parseInt(parsed.timestamp, 10);
  if (!Number.isFinite(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Math.floor(now.getTime() / 1000) - timestampSeconds);
  if (ageSeconds > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}:${rawBody.toString("utf8")}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  return parsed.signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, "hex");
    return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

function getCustomData(event: any): Record<string, unknown> {
  const data = event?.data?.custom_data ?? event?.data?.customData ?? {};
  return data && typeof data === "object" ? data : {};
}

function getSubjectId(customData: Record<string, unknown>) {
  const explicitSubject = customData.billingSubject;
  if (typeof explicitSubject === "string" && explicitSubject.trim()) return explicitSubject.trim();

  const uid = customData.uid;
  if (typeof uid === "string" && uid.trim()) return `uid:${uid.trim()}`;

  return null;
}

function collectPriceIds(value: unknown, output = new Set<string>()) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectPriceIds(item, output));
    return output;
  }

  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    if ((key === "price_id" || key === "priceId" || key === "id") && typeof nested === "string" && nested.startsWith("pri_")) {
      output.add(nested);
    }
    if (nested && typeof nested === "object") collectPriceIds(nested, output);
  }
  return output;
}

function matchesExpectedPrice(event: any, expectedPriceId: string) {
  const customData = getCustomData(event);
  const customPriceId = customData.priceId ?? customData.price_id;
  if (typeof customPriceId === "string" && customPriceId !== expectedPriceId) return false;

  const priceIds = collectPriceIds(event?.data);
  return priceIds.size === 0 || priceIds.has(expectedPriceId);
}

export function extractPaddleBillingUpdate(event: any, expectedPriceId = HINA_PRO_PRICE_ID): PaddleBillingUpdate | null {
  const eventType = typeof event?.event_type === "string"
    ? event.event_type
    : typeof event?.eventType === "string"
      ? event.eventType
      : "";
  const customData = getCustomData(event);
  const subjectId = getSubjectId(customData);
  if (!subjectId || !matchesExpectedPrice(event, expectedPriceId)) return null;

  if (eventType === "transaction.paid" || eventType === "subscription.activated") {
    return { subjectId, plan: "pro" };
  }

  if (eventType === "subscription.updated") {
    const status = event?.data?.status;
    return { subjectId, plan: status === "active" ? "pro" : "free" };
  }

  if (eventType === "subscription.canceled" || eventType === "subscription.paused") {
    return { subjectId, plan: "free" };
  }

  return null;
}
