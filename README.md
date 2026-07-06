<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Hina

Hina is an AI English learning companion with a lively international-student persona, structured language tips, voice playback, cloud chat history, avatar/profile settings, quota-aware Pro scaffolding, and opt-in proactive in-app openers.

View your app in AI Studio: https://ai.studio/apps/f545bc87-5883-43c8-b172-c964c6c056a8

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set `OPENAI_API_KEY` in `.env.local` to your OpenAI API key. Optional model settings are `OPENAI_CHAT_MODEL`, `OPENAI_TTS_MODEL`, and `OPENAI_TTS_VOICE`.
3. Run the app:
   `npm run dev`

## Useful Commands

- `npm run test` runs the service and render tests.
- `npm run lint` runs TypeScript checks.
- `npm run build` builds the Vite app and bundled Node server.

## Production Notes

- Enable Firebase Authentication providers for Email/Password and Google. Add every deployed or preview host, including local `localhost`, to Firebase Authentication's authorized domains.
- Deploy both `firestore.rules` and `storage.rules`. Avatar uploads use Firebase Storage under `avatars/{uid}/...` and are limited to JPG, PNG, WebP, or GIF files up to 10MB.
- Proactive settings are saved at `/users/{uid}/settings/proactive`, with browser localStorage retained as a fallback and migration source.
- AI calls use OpenAI when `OPENAI_API_KEY` is configured. Set `AI_PROVIDER=openai` to force OpenAI, or `AI_PROVIDER=gemini` to force the Gemini fallback. Without `AI_PROVIDER`, OpenAI wins when both keys exist. After changing Vercel environment variables, redeploy Production.
- Free/Pro usage is enforced server-side before AI model calls. Set `FREE_DAILY_CHAT_LIMIT` and `PRO_DAILY_CHAT_LIMIT`; `PRO_DAILY_CHAT_LIMIT=0` means unlimited.
- Production quota persistence and Firebase ID-token verification use Firebase Admin when `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`, `FIREBASE_ADMIN_CLIENT_EMAIL` plus `FIREBASE_ADMIN_PRIVATE_KEY`, or `GOOGLE_APPLICATION_CREDENTIALS` is configured. Without Admin credentials, the server falls back to in-memory/IP usage and is suitable only for local testing.
- `/api/billing/checkout` is intentionally a stub that returns `billing_not_ready`; real Stripe, PayPal, or Google Pay checkout is not wired yet.
