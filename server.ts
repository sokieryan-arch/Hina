import express from "express";
import path from "path";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { canUseChat, createBillingStoreFromEnv } from "./src/server/billing.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const billingStore = createBillingStoreFromEnv();

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

function hasFirebaseAdminConfig() {
  return Boolean(
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
    || (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY)
    || process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}

function serviceAccountFromEnv() {
  if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

let adminAuthPromise: Promise<any> | null = null;

async function getAdminAuth() {
  if (!adminAuthPromise) {
    adminAuthPromise = (async () => {
      const appAdmin = await import("firebase-admin/app");
      const authAdmin = await import("firebase-admin/auth");
      const appName = "hina-auth";
      const existing = appAdmin.getApps().find((app) => app.name === appName);
      const serviceAccount = serviceAccountFromEnv();
      const credential = serviceAccount
        ? appAdmin.cert(serviceAccount)
        : appAdmin.applicationDefault();
      const app = existing ?? appAdmin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID,
      }, appName);
      return authAdmin.getAuth(app);
    })();
  }
  return adminAuthPromise;
}

async function getBillingSubject(req: express.Request) {
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const token = extractBearerToken(authorization);

  if (token && hasFirebaseAdminConfig()) {
    try {
      const decoded = await (await getAdminAuth()).verifyIdToken(token);
      if (decoded.uid) return `uid:${decoded.uid}`;
    } catch (error) {
      console.warn("Firebase Admin token verification failed; falling back to IP quota.", error);
    }
  }

  return `ip:${getRequestIp(req)}`;
}

const app = express();
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

app.post("/api/billing/checkout", async (_req, res) => {
  res.status(503).json({ error: "billing_not_ready" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const billingSubject = await getBillingSubject(req);
    const billing = await billingStore.getBillingSummary(billingSubject);
    if (!canUseChat(billing)) {
      return res.status(402).json({ error: "quota_exceeded", billing });
    }

    const contents = messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction: HINA_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                response: {
                  type: Type.STRING,
                  description: "Your friendly conversational response to the user's message. Read their prompt carefully and reply.",
                },
                correction: {
                  type: Type.STRING,
                  description: "If there were any grammar or spelling errors in the user's message, gently correct them here (start with e.g., 'By the way... ✨'). If no errors, leave empty or omit.",
                },
                insight: {
                  type: Type.STRING,
                  description: "A short, fun tip about an idiom or vocabulary word used in the conversation. e.g. '💡 Quick Tip: ...'. If none, leave empty.",
                },
              },
              required: ["response"],
            },
          },
        });
        break;
      } catch (err: any) {
        if (err.status === "UNAVAILABLE" || err.status === "RESOURCE_EXHAUSTED" || err.message?.includes("503") || err.message?.includes("429") || err.message?.includes("Quota exceeded")) {
          retries -= 1;
          if (retries === 0) {
            return res.status(503).json({ error: "The AI is currently experiencing high demand. Please try again later.", code: 503 });
          }
          let delay = (4 - retries) * 1000;
          let externalDelayMatch = null;
          if (err.message) {
            externalDelayMatch = err.message.match(/retry in ([\d.]+)s/);
          }
          if (externalDelayMatch?.[1]) {
            const seconds = parseFloat(externalDelayMatch[1]);
            if (seconds > 5) {
              return res.status(429).json({ error: `The AI is temporarily out of breath. Let's wait about ${Math.ceil(seconds)} seconds and try again!`, code: 429 });
            }
            delay = Math.ceil(seconds) * 1000 + 500;
          }
          console.log(`Rate limited or unavailable on Chat. Retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }

    if (!response?.text) {
      throw new Error("No text from model");
    }

    const parsed = JSON.parse(response.text.trim());
    const nextBilling = await billingStore.incrementChatUsage(billingSubject);
    res.json({ ...parsed, billing: nextBilling });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Failed to generate response. Please try again later." });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
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
        });
        break;
      } catch (err: any) {
        if (err.status === "RESOURCE_EXHAUSTED" || err.message?.includes("429") || err.message?.includes("Quota exceeded")) {
          retries -= 1;
          if (retries === 0) {
            return res.status(429).json({ error: "Voice generation is temporarily rate-limited. Please try again later.", code: 429 });
          }
          let delay = 2000;
          let externalDelayMatch = null;
          if (err.message) {
            externalDelayMatch = err.message.match(/retry in ([\d.]+)s/);
          }
          if (externalDelayMatch?.[1]) {
            const seconds = parseFloat(externalDelayMatch[1]);
            if (seconds > 5) {
              return res.status(429).json({ error: `Voice generation is taking a short breather. Please try again in ${Math.ceil(seconds)}s.`, code: 429 });
            }
            delay = Math.ceil(seconds) * 1000 + 500;
          }
          console.log(`Rate limited on TTS. Retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }

    const inlineData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      throw new Error("No audio generated");
    }

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

    res.json({ audio: audioData, mimeType: outMimeType });
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
