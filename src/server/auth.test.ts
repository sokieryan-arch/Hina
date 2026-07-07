import assert from "node:assert/strict";
import test from "node:test";
import { verifyFirebaseIdTokenWithRest } from "./auth";

test("verifyFirebaseIdTokenWithRest returns Firebase localId as uid", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      async json() {
        return { users: [{ localId: "firebase-user-1" }] };
      },
    } as Response;
  };

  const uid = await verifyFirebaseIdTokenWithRest("id-token", {
    apiKey: "web-api-key",
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.equal(uid, "firebase-user-1");
  assert.equal(calls[0].url, "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=web-api-key");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, JSON.stringify({ idToken: "id-token" }));
});

test("verifyFirebaseIdTokenWithRest rejects lookup responses without a uid", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { users: [] };
    },
  }) as Response;

  await assert.rejects(
    verifyFirebaseIdTokenWithRest("id-token", {
      apiKey: "web-api-key",
      fetchImpl: fetchImpl as typeof fetch,
    }),
    /did not include a uid/,
  );
});
