import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiHandlers, authMode } from "./src/server/runtime.js";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.post("/api/chat", async (req, res) => {
    const result = await apiHandlers.chat(req);
    res.status(result.status).json(result.body);
  });

  app.post("/api/proactive/draft", async (req, res) => {
    const result = await apiHandlers.proactiveDraft(req);
    res.status(result.status).json(result.body);
  });

  app.post("/api/tts", async (req, res) => {
    const result = await apiHandlers.tts(req);
    res.status(result.status).json(result.body);
  });

  if (process.env.NODE_ENV !== "production") {
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
    console.log(`AI auth mode: ${authMode}`);
  });
}

startServer();
