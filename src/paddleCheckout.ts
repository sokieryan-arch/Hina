import type { User } from "firebase/auth";

export const HINA_PRO_PRICE_ID = "pri_01kwxsfc7hyn0b94ptrtf7y2ek";
const PADDLE_SCRIPT_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";

export interface PaddleClientConfig {
  clientToken: string;
  environment: "production" | "sandbox";
  priceId: string;
}

interface PaddleGlobal {
  Environment?: {
    set: (environment: "sandbox") => void;
  };
  Initialize: (input: { token: string; eventCallback?: (event: any) => void }) => void;
  Checkout: {
    open: (input: Record<string, unknown>) => void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

function getDefaultClientEnv(): Record<string, string | undefined> {
  return ((import.meta as any).env || {}) as Record<string, string | undefined>;
}

export function readPaddleClientConfig(env = getDefaultClientEnv()): PaddleClientConfig {
  const clientToken = env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  if (!clientToken) {
    throw new Error("VITE_PADDLE_CLIENT_TOKEN is not configured.");
  }

  const environment = env.VITE_PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  return {
    clientToken,
    environment,
    priceId: (env.VITE_PADDLE_PRICE_ID || HINA_PRO_PRICE_ID).trim(),
  };
}

let paddleLoadPromise: Promise<PaddleGlobal> | null = null;

function loadPaddleScript() {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (paddleLoadPromise) return paddleLoadPromise;

  paddleLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PADDLE_SCRIPT_URL}"]`);
    const script = existing ?? document.createElement("script");
    script.src = PADDLE_SCRIPT_URL;
    script.async = true;
    script.onload = () => window.Paddle ? resolve(window.Paddle) : reject(new Error("Paddle.js did not initialize."));
    script.onerror = () => reject(new Error("Paddle.js failed to load."));
    if (!existing) document.head.appendChild(script);
  });

  return paddleLoadPromise;
}

export async function openHinaProCheckout(user: User, onCheckoutComplete?: () => void) {
  const config = readPaddleClientConfig();
  const paddle = await loadPaddleScript();

  if (config.environment === "sandbox") {
    paddle.Environment?.set("sandbox");
  }

  paddle.Initialize({
    token: config.clientToken,
    eventCallback: (event) => {
      const eventName = event?.name || event?.event;
      if (eventName === "checkout.completed") {
        onCheckoutComplete?.();
      }
    },
  });

  paddle.Checkout.open({
    items: [{ priceId: config.priceId, quantity: 1 }],
    customer: user.email ? { email: user.email } : undefined,
    customData: {
      uid: user.uid,
      billingSubject: `uid:${user.uid}`,
      plan: "pro",
      priceId: config.priceId,
    },
    settings: {
      displayMode: "overlay",
      locale: "en",
      successUrl: `${window.location.origin}/?checkout=success`,
      theme: "light",
    },
  });
}
