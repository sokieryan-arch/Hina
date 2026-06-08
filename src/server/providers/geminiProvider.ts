import { GoogleGenAI, Modality, Type } from "@google/genai";
import { HINA_SYSTEM_INSTRUCTION } from "../hinaPrompt.js";
import { buildProactivePrompt } from "../proactive.js";
import { normalizeLanguageTips } from "../../shared/languageTips.js";
import type { ChatMessageInput } from "../requestGuards.js";
import type { LanguagePartnerProvider, LanguagePartnerResponse, SpeechResponse } from "./types.js";

function pcmBase64ToWavBase64(
  pcmBase64: string,
  sampleRate = 24_000,
  numChannels = 1,
  bitsPerSample = 16,
): string {
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

  return Buffer.concat([wavHeader, pcmBytes]).toString("base64");
}

const tipSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ["correction", "expression", "culture"],
    },
    title: {
      type: Type.STRING,
    },
    body: {
      type: Type.STRING,
    },
    example: {
      type: Type.STRING,
    },
    original: {
      type: Type.STRING,
    },
    suggestion: {
      type: Type.STRING,
    },
  },
  required: ["type", "title", "body"],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    response: {
      type: Type.STRING,
      description: "Hina's friendly conversational response.",
    },
    tips: {
      type: Type.ARRAY,
      description: "Exactly two language learning tips.",
      items: tipSchema,
      minItems: 2,
      maxItems: 2,
    },
  },
  required: ["response", "tips"],
};

export class GeminiLanguagePartnerProvider implements LanguagePartnerProvider {
  private readonly ai: GoogleGenAI;
  private readonly chatModel: string;
  private readonly ttsModel: string;

  constructor(apiKey: string | undefined) {
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY.");
    }

    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "hina-language-partner",
        },
      },
    });
    this.chatModel = process.env.GEMINI_CHAT_MODEL || "gemini-3.5-flash";
    this.ttsModel = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
  }

  async chat(messages: ChatMessageInput[]): Promise<LanguagePartnerResponse> {
    return this.generateStructuredResponse(messages);
  }

  async draftProactiveOpener(input: Parameters<LanguagePartnerProvider["draftProactiveOpener"]>[0]): Promise<LanguagePartnerResponse> {
    return this.generateStructuredResponse([
      {
        role: "user",
        text: buildProactivePrompt(input),
      },
    ]);
  }

  async speak(text: string): Promise<SpeechResponse> {
    const response = await this.ai.models.generateContent({
      model: this.ttsModel,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: process.env.GEMINI_TTS_VOICE || "Aoede" },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      throw new Error("No audio generated.");
    }

    let audio = inlineData.data;
    let mimeType = inlineData.mimeType || "audio/pcm;rate=24000";

    if (mimeType.startsWith("audio/pcm") || mimeType.startsWith("audio/l16")) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const rate = rateMatch?.[1] ? Number.parseInt(rateMatch[1], 10) : 24_000;
      audio = pcmBase64ToWavBase64(audio, rate);
      mimeType = "audio/wav";
    }

    return { audio, mimeType };
  }

  private async generateStructuredResponse(messages: ChatMessageInput[]): Promise<LanguagePartnerResponse> {
    const response = await this.ai.models.generateContent({
      model: this.chatModel,
      contents: messages.map((message) => ({
        role: message.role,
        parts: [{ text: message.text }],
      })),
      config: {
        systemInstruction: HINA_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      },
    });

    if (!response.text) {
      throw new Error("No text from model.");
    }

    const parsed = JSON.parse(response.text.trim()) as Record<string, unknown>;
    return {
      response: typeof parsed.response === "string" ? parsed.response.trim() : "",
      tips: normalizeLanguageTips(parsed.tips),
    };
  }
}

export function createLanguagePartnerProvider(): LanguagePartnerProvider {
  const provider = process.env.LLM_PROVIDER || "gemini";
  if (provider !== "gemini") {
    throw new Error(`Unsupported LLM_PROVIDER "${provider}". Add an adapter before using it.`);
  }

  return new GeminiLanguagePartnerProvider(process.env.GEMINI_API_KEY);
}

export function createLazyLanguagePartnerProvider(): LanguagePartnerProvider {
  let provider: LanguagePartnerProvider | null = null;

  function getProvider() {
    provider ??= createLanguagePartnerProvider();
    return provider;
  }

  return {
    async chat(messages) {
      return getProvider().chat(messages);
    },
    async draftProactiveOpener(input) {
      return getProvider().draftProactiveOpener(input);
    },
    async speak(text) {
      return getProvider().speak(text);
    },
  };
}
