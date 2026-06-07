# Hina

Hina is an AI English learning companion with a lively international-student persona, structured language tips, voice playback, cloud chat history, and opt-in proactive in-app openers.

## Run Locally

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.
3. Run the app:
   `npm run dev`

## Useful Commands

- `npm run test` runs the service-layer tests.
- `npm run lint` runs TypeScript checks.
- `npm run build` builds the Vite app and bundled Node server.

## Production Notes

- `AI_AUTH_MODE` defaults to `required` when `NODE_ENV=production`. Set `FIREBASE_PROJECT_ID` so the server can verify Firebase ID tokens with Firebase Secure Token JWKS.
- `/api/chat`, `/api/tts`, and `/api/proactive/draft` all apply per-user or per-IP rate limits.
- Proactive nudges are currently app-open drafts. Real background push needs a delivery adapter such as Firebase Cloud Messaging, native mobile push, WeChat subscription messages, SMS, or an email channel.
- `LLM_PROVIDER` is intentionally isolated. Mainland China deployment should add a domestic model adapter and domestic data storage instead of relying on Gemini and Firebase as the production path.
