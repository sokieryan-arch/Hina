import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ApiResult } from "./apiHandlers.js";

type Handler = (request: VercelRequest) => Promise<ApiResult>;

export async function runVercelApiHandler(
  req: VercelRequest,
  res: VercelResponse,
  handler: Handler,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await handler(req);
  return res.status(result.status).json(result.body);
}
