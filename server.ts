import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

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

  // RIFF chunk descriptor
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + dataSize, 4);
  wavHeader.write("WAVE", 8);

  // "fmt " sub-chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); 
  wavHeader.writeUInt16LE(1, 20); 
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24); 
  wavHeader.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); 
  wavHeader.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); 
  wavHeader.writeUInt16LE(bitsPerSample, 34); 

  // "data" sub-chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([wavHeader, pcmBytes]);
  return wavBuffer.toString("base64");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Chat API
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body; // array of { role: 'user' | 'model', text: string }

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
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
                    description: "Your friendly conversational response to the user's message. Read their prompt carefully and reply."
                  },
                  correction: {
                    type: Type.STRING,
                    description: "If there were any grammar or spelling errors in the user's message, gently correct them here (start with e.g., 'By the way... ✨'). If no errors, leave empty or omit."
                  },
                  insight: {
                    type: Type.STRING,
                    description: "A short, fun tip about an idiom or vocabulary word used in the conversation. e.g. '💡 Quick Tip: ...'. If none, leave empty."
                  }
                },
                required: ["response"]
              }
            }
          });
          break; // success
        } catch (err: any) {
          if (err.status === "UNAVAILABLE" || err.status === "RESOURCE_EXHAUSTED" || err.message?.includes("503") || err.message?.includes("429") || err.message?.includes("Quota exceeded")) {
            retries--;
            if (retries === 0) {
              return res.status(503).json({ error: "The AI is currently experiencing high demand. Please try again later.", code: 503 });
            }
            // Parse retryDelay from error if possible, else default to 2s, 4s, etc.
            let delay = (4 - retries) * 2000;
            if (err.message) {
              const delayMatch = err.message.match(/retry in ([\d\.]+)s/);
              if (delayMatch && delayMatch[1]) {
                delay = Math.ceil(parseFloat(delayMatch[1])) * 1000 + 1000;
              }
            }
            console.log(`Rate limited or Unavailable on Chat (503/429). Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw err;
          }
        }
      }

      if (!response) {
        throw new Error("No response generated");
      }

      const responseText = response.text;
      if (!responseText) {
          throw new Error("No text from model");
      }
      
      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);

    } catch (error: any) {
      console.error("Chat Error:", error);
      res.status(500).json({ error: "Failed to generate response. Please try again later." });
    }
  });

  // TTS API
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
                  prebuiltVoiceConfig: { voiceName: "Aoede" }, // Young, energetic female voice
                },
              },
            },
          });
          break; // success
        } catch (err: any) {
          if (err.status === "RESOURCE_EXHAUSTED" || err.message?.includes("429") || err.message?.includes("Quota exceeded")) {
            retries--;
            if (retries === 0) {
              return res.status(429).json({ error: "Voice generation is temporarily rate-limited. Please try again later.", code: 429 });
            }
            // Parse retryDelay from error if possible, else default to 20s
            let delay = 20000;
            if (err.message) {
              const delayMatch = err.message.match(/retry in ([\d\.]+)s/);
              if (delayMatch && delayMatch[1]) {
                delay = Math.ceil(parseFloat(delayMatch[1])) * 1000 + 1000; // Add 1s buffer
              }
            }
            console.log(`Rate limited on TTS. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw err;
          }
        }
      }

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData || !inlineData.data) {
        throw new Error("No audio generated");
      }

      let audioData = inlineData.data;
      let outMimeType = inlineData.mimeType || "audio/pcm;rate=24000";

      if (outMimeType.startsWith("audio/pcm") || outMimeType.startsWith("audio/l16")) {
        // Parse rate if available
        let rate = 24000;
        const rateMatch = outMimeType.match(/rate=(\d+)/);
        if (rateMatch && rateMatch[1]) {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
