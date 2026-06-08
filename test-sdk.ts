import { GoogleGenAI, Type } from "@google/genai";
console.log("Starting SDK test...");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
try {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: "Hello" }] }]
  });
  console.log("Response:", response.text);
} catch (e) {
  console.error("SDK Error:", e);
}
console.log("SDK test finished.");
