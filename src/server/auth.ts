export interface FirebaseRestVerificationOptions {
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
}

export async function verifyFirebaseIdTokenWithRest(
  idToken: string,
  { apiKey, fetchImpl = fetch }: FirebaseRestVerificationOptions,
) {
  if (!apiKey) {
    throw new Error("Firebase web API key is not configured.");
  }

  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!response.ok) {
    throw new Error(`Firebase Auth REST verification failed with status ${response.status}.`);
  }

  const data = await response.json() as { users?: Array<{ localId?: unknown }> };
  const uid = data.users?.[0]?.localId;
  if (typeof uid !== "string" || !uid.trim()) {
    throw new Error("Firebase Auth REST verification did not include a uid.");
  }

  return uid.trim();
}
