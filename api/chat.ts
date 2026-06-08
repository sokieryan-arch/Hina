import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandlers } from "../src/server/runtime.js";
import { runVercelApiHandler } from "../src/server/vercelAdapter.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return runVercelApiHandler(req, res, apiHandlers.chat);
}
