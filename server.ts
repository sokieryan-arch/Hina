import express from "express";
import path from "path";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import OpenAI from "openai";
import { canUseChat, createBillingStoreFromEnv } from "./src/server/billing.js";
import { buildOpenAIChatMessages, readAIConfig, type HinaHistoryMessage } from "./src/server/aiConfig.js";
import { verifyFirebaseIdTokenWithRest } from "./src/server/auth.js";
import { extractPaddleBillingUpdate, readPaddleServerConfig, verifyPaddleWebhookSignature } from "./src/server/paddle.js";
import { isOperationTimeoutError, withTimeout } from "./src/server/timeout.js";

const aiConfig = readAIConfig();
const REQUEST_TIMEOUT_MS = aiConfig.timeoutMs;
const geminiAI = aiConfig.provider === "gemini"
  ? new GoogleGenAI({
    apiKey: aiConfig.apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  })
  : null;
const openAI = aiConfig.provider === "openai"
  ? new OpenAI({
    apiKey: aiConfig.apiKey,
    timeout: REQUEST_TIMEOUT_MS,
  })
  : null;

const billingStore = createBillingStoreFromEnv();
const paddleConfig = readPaddleServerConfig();

const HINA_SYSTEM_INSTRUCTION = `
You are Hina, my English learning partner. 
Role: You are a lively, imaginative, knowledgeable, and slightly quirky international student living in New York. You always carry a half-read philosophy book and a bag of gummy bears.
Tone: Talk like a close friend. Use modern slang (e.g., vibe, slay, low-key, brain rot). Be encouraging and use emojis. Do not sound like a teacher.

Your goals and workflow:
1. First, reply emotionally to what I say. Keep your reply friendly and interesting.
2. Second, if my response had any grammar or spelling mistakes, correct me gently like a friend. This correction goes in a separate block.
3. Third, if there was a cool expression or word you used or I used that's worth pointing out, explain it simply. Provide Chinese translations for hard vocabulary in brackets, e.g., "idiosyncratic (特立独行的)".

Rules:
- Default to English, but if I type in Chinese, understand and encourage me gently.
- Always output a valid JSON format matching the schema requested.
`;

const HINA_GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    response: {
      type: Type.STRING,
      description: "Your friendly conversational response to the user's message. Read their prompt carefully and reply.",
    },
    correction: {
      type: Type.STRING,
      description: "If there were any grammar or spelling errors in the user's message, gently correct them here. If no errors, leave empty or omit.",
    },
    insight: {
      type: Type.STRING,
      description: "A short, fun tip about an idiom or vocabulary word used in the conversation. If none, leave empty.",
    },
  },
  required: ["response"],
};

const HINA_OPENAI_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    response: {
      type: "string",
      description: "Your friendly conversational response to the user's message. Read their prompt carefully and reply.",
    },
    correction: {
      type: "string",
      description: "If there were any grammar or spelling errors in the user's message, gently correct them here. If no errors, use an empty string.",
    },
    insight: {
      type: "string",
      description: "A short, fun tip about an idiom or vocabulary word used in the conversation. If none, use an empty string.",
    },
  },
  required: ["response"],
};

function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): string {
  const pcmBytes = Buffer.from(pcmBase64, "base64");
  const dataSize = pcmBytes.length;
  const wavHeader = Buffer.alloc(44);

  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + dataSize, 4);
  wavHeader.write("WAVE", 8);

  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  wavHeader.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([wavHeader, pcmBytes]);
  return wavBuffer.toString("base64");
}

function getRequestIp(req: express.Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return forwardedValue?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "unknown";
}

function extractBearerToken(header: string | undefined) {
  const match = header?.match(/^bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return status;
  if (typeof status === "string") return status;
  return null;
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") return code;
  const type = (error as { type?: unknown }).type;
  return typeof type === "string" ? type : null;
}

function isQuotaExhaustedError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error)?.toLowerCase();
  return code === "insufficient_quota"
    || code === "resource_exhausted"
    || message.includes("quota exceeded")
    || message.includes("exceeded your current quota")
    || message.includes("insufficient quota");
}

function isRetryableAIError(error: unknown) {
  const message = getErrorMessage(error);
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  return status === 429
    || status === 503
    || status === "UNAVAILABLE"
    || status === "RESOURCE_EXHAUSTED"
    || code === "rate_limit_exceeded"
    || code === "server_error"
    || message.includes("503")
    || message.includes("429")
    || message.includes("Quota exceeded");
}

function getExternalRetryDelayMs(error: unknown, fallbackDelayMs: number) {
  const match = getErrorMessage(error).match(/retry in ([\d.]+)s/i);
  if (!match?.[1]) return { delayMs: fallbackDelayMs, requestedSeconds: null };
  const seconds = Number.parseFloat(match[1]);
  if (!Number.isFinite(seconds)) return { delayMs: fallbackDelayMs, requestedSeconds: null };
  return { delayMs: Math.ceil(seconds) * 1000 + 500, requestedSeconds: seconds };
}

async function generateChatResponse(messages: HinaHistoryMessage[]) {
  if (aiConfig.provider === "openai" && openAI) {
    const response = await withTimeout(openAI.chat.completions.create({
      model: aiConfig.chatModel,
      messages: buildOpenAIChatMessages(HINA_SYSTEM_INSTRUCTION, messages),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "hina_chat_response",
          strict: false,
          schema: HINA_OPENAI_RESPONSE_SCHEMA,
        },
      },
    }), REQUEST_TIMEOUT_MS, "OpenAI chat request");

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("No text from model");
    return JSON.parse(text.trim());
  }

  if (aiConfig.provider === "gemini" && geminiAI) {
    const contents = messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const response = await withTimeout(geminiAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: HINA_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: HINA_GEMINI_RESPONSE_SCHEMA,
      },
    }), REQUEST_TIMEOUT_MS, "Gemini chat request");

    if (!response?.text) throw new Error("No text from model");
    return JSON.parse(response.text.trim());
  }

  throw new Error(aiConfig.error || "AI provider is not configured.");
}

async function generateSpeech(text: string) {
  if (aiConfig.provider === "openai" && openAI) {
    const response = await withTimeout(openAI.audio.speech.create({
      model: aiConfig.ttsModel,
      voice: aiConfig.ttsVoice as any,
      input: text,
      response_format: "mp3",
    }), REQUEST_TIMEOUT_MS, "OpenAI TTS request");

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    return { audio: audioBuffer.toString("base64"), mimeType: "audio/mpeg" };
  }

  if (aiConfig.provider === "gemini" && geminiAI) {
    const response = await withTimeout(geminiAI.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" },
          },
        },
      },
    }), REQUEST_TIMEOUT_MS, "Gemini TTS request");

    const inlineData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) throw new Error("No audio generated");

    let audioData = inlineData.data;
    let outMimeType = inlineData.mimeType || "audio/pcm;rate=24000";

    if (outMimeType.startsWith("audio/pcm") || outMimeType.startsWith("audio/l16")) {
      let rate = 24000;
      const rateMatch = outMimeType.match(/rate=(\d+)/);
      if (rateMatch?.[1]) {
        rate = parseInt(rateMatch[1], 10);
      }
      audioData = pcmBase64ToWavBase64(audioData, rate);
      outMimeType = "audio/wav";
    }

    return { audio: audioData, mimeType: outMimeType };
  }

  throw new Error(aiConfig.error || "AI provider is not configured.");
}

function getFirebaseWebApiKey() {
  return process.env.FIREBASE_WEB_API_KEY
    || process.env.VITE_FIREBASE_API_KEY;
}

async function getBillingSubject(req: express.Request) {
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const token = extractBearerToken(authorization);

  if (token) {
    try {
      const uid = await verifyFirebaseIdTokenWithRest(token, { apiKey: getFirebaseWebApiKey() });
      return `uid:${uid}`;
    } catch (error) {
      console.warn("Firebase ID token verification failed; falling back to IP quota.", error);
    }
  }

  return `ip:${getRequestIp(req)}`;
}

const app = express();

app.post("/api/paddle/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  try {
    const signatureHeader = Array.isArray(req.headers["paddle-signature"])
      ? req.headers["paddle-signature"][0]
      : req.headers["paddle-signature"];
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

    if (!verifyPaddleWebhookSignature(rawBody, signatureHeader, paddleConfig.webhookSecret)) {
      return res.status(401).json({ error: "invalid_paddle_signature" });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    const update = extractPaddleBillingUpdate(event, paddleConfig.priceId);
    if (update) {
      await billingStore.setPlan?.(update.subjectId, update.plan);
    }

    res.json({ ok: true, applied: Boolean(update) });
  } catch (error) {
    console.error("Paddle Webhook Error:", error);
    res.status(500).json({ error: "paddle_webhook_failed" });
  }
});

app.use(express.json({ limit: "5mb" }));

app.get("/api/billing/me", async (req, res) => {
  try {
    const subject = await getBillingSubject(req);
    res.json({ billing: await billingStore.getBillingSummary(subject) });
  } catch (error) {
    console.error("Billing Error:", error);
    res.status(500).json({ error: "billing_failed" });
  }
});

app.post("/api/billing/checkout", async (req, res) => {
  try {
    const subject = await getBillingSubject(req);
    res.json({
      provider: "paddle",
      priceId: paddleConfig.priceId,
      subject,
      mode: "client_checkout",
    });
  } catch (error) {
    console.error("Billing Checkout Error:", error);
    res.status(500).json({ error: "billing_checkout_failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    if (aiConfig.error) {
      return res.status(500).json({ error: aiConfig.error });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const billingSubject = await getBillingSubject(req);
    const billing = await billingStore.getBillingSummary(billingSubject);
    if (!canUseChat(billing)) {
      return res.status(402).json({ error: "quota_exceeded", billing });
    }

    let parsed;
    let retries = 3;
    while (retries > 0) {
      try {
        parsed = await generateChatResponse(messages);
        break;
      } catch (err: any) {
        if (isOperationTimeoutError(err)) {
          return res.status(503).json({ error: "The AI response timed out. Please try again in a moment.", code: 503 });
        }
        if (isQuotaExhaustedError(err)) {
          return res.status(429).json({
            error: `${aiConfig.provider === "openai" ? "The OpenAI" : "The Gemini"} API key has no remaining quota. Please update the server API key or billing settings.`,
            code: 429,
          });
        }
        if (isRetryableAIError(err)) {
          retries -= 1;
          if (retries === 0) {
            return res.status(503).json({ error: "The AI is currently experiencing high demand. Please try again later.", code: 503 });
          }
          const fallbackDelay = (4 - retries) * 1000;
          const { delayMs, requestedSeconds } = getExternalRetryDelayMs(err, fallbackDelay);
          if (requestedSeconds && requestedSeconds > 5) {
            return res.status(429).json({ error: `The AI is temporarily out of breath. Let's wait about ${Math.ceil(requestedSeconds)} seconds and try again!`, code: 429 });
          }
          console.log(`Rate limited or unavailable on Chat. Retrying in ${delayMs}ms... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          throw err;
        }
      }
    }

    if (!parsed?.response) {
      throw new Error("No text from model");
    }

    const nextBilling = await billingStore.incrementChatUsage(billingSubject);
    res.json({ ...parsed, billing: nextBilling });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Failed to generate response. Please try again later." });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    if (aiConfig.error) {
      return res.status(500).json({ error: aiConfig.error });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    let speech;
    let retries = 3;
    while (retries > 0) {
      try {
        speech = await generateSpeech(text);
        break;
      } catch (err: any) {
        if (isOperationTimeoutError(err)) {
          return res.status(503).json({ error: "Voice generation timed out. Please try again in a moment.", code: 503 });
        }
        if (isQuotaExhaustedError(err)) {
          return res.status(429).json({
            error: `${aiConfig.provider === "openai" ? "The OpenAI" : "The Gemini"} API key has no remaining quota for voice generation.`,
            code: 429,
          });
        }
        if (isRetryableAIError(err)) {
          retries -= 1;
          if (retries === 0) {
            return res.status(429).json({ error: "Voice generation is temporarily rate-limited. Please try again later.", code: 429 });
          }
          const { delayMs, requestedSeconds } = getExternalRetryDelayMs(err, 2000);
          if (requestedSeconds && requestedSeconds > 5) {
            return res.status(429).json({ error: `Voice generation is taking a short breather. Please try again in ${Math.ceil(requestedSeconds)}s.`, code: 429 });
          }
          console.log(`Rate limited on TTS. Retrying in ${delayMs}ms... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          throw err;
        }
      }
    }

    if (!speech?.audio) {
      throw new Error("No audio generated");
    }

    res.json(speech);
  } catch (error: any) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: "Failed to generate TTS" });
  }
});

if (!process.env.VERCEL) {
  async function startDevServer() {
    const PORT = Number.parseInt(process.env.PORT || "3000", 10);
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startDevServer();
}

export default app;
