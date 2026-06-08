import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandlers } from "../../src/server/runtime";
import { runVercelApiHandler } from "../../src/server/vercelAdapter";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return runVercelApiHandler(req, res, apiHandlers.proactiveDraft);
}
