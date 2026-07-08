export interface FirebaseRestVerificationOptions {
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
}

export interface FirebaseTokenUser {
  uid: string;
  email: string | null;
  emailVerified: boolean | null;
  providerIds: string[];
}

export class EmailVerificationRequiredError extends Error {
  status = 403;
  code = "email_not_verified";

  constructor() {
    super("email_not_verified");
  }
}

export function isEmailVerificationRequiredError(error: unknown): error is EmailVerificationRequiredError {
  return error instanceof EmailVerificationRequiredError
    || Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "email_not_verified");
}

export function assertFirebaseUserCanUseProtectedApis(user: FirebaseTokenUser) {
  if (user.providerIds.includes("password") && user.emailVerified === false) {
    throw new EmailVerificationRequiredError();
  }
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

  const data = await response.json() as {
    users?: Array<{
      localId?: unknown;
      email?: unknown;
      emailVerified?: unknown;
      providerUserInfo?: Array<{ providerId?: unknown }>;
    }>;
  };
  const account = data.users?.[0];
  const uid = account?.localId;
  if (typeof uid !== "string" || !uid.trim()) {
    throw new Error("Firebase Auth REST verification did not include a uid.");
  }

  return {
    uid: uid.trim(),
    email: typeof account.email === "string" ? account.email : null,
    emailVerified: typeof account.emailVerified === "boolean" ? account.emailVerified : null,
    providerIds: Array.isArray(account.providerUserInfo)
      ? account.providerUserInfo
        .map((provider) => provider.providerId)
        .filter((providerId): providerId is string => typeof providerId === "string")
      : [],
  };
}
