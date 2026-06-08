import type { AuthMode } from "./requestGuards";

export interface RequestIdentity {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  ip: string;
  rateLimitKey: string;
}

export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
}

let firebaseAuthPromise: Promise<any> | null = null;
let firebaseJwks: any = null;

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function getRequestIp(request: RequestLike): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwardedIp = forwardedValue?.split(",")[0]?.trim();
  return firstForwardedIp || request.ip || request.socket?.remoteAddress || "unknown";
}

async function verifyFirebaseIdToken(token: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw Object.assign(new Error("Missing FIREBASE_PROJECT_ID."), { statusCode: 500 });
  }

  if (!firebaseAuthPromise) {
    firebaseAuthPromise = (async () => {
      const { createRemoteJWKSet, jwtVerify } = await import("jose");
      firebaseJwks ??= createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

      return { jwtVerify };
    })();
  }

  const { jwtVerify } = await firebaseAuthPromise;
  const { payload } = await jwtVerify(token, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Firebase token is missing a subject.");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

export async function resolveRequestIdentity(
  request: RequestLike,
  authMode: AuthMode,
): Promise<RequestIdentity> {
  const ip = getRequestIp(request);
  const authorization = request.headers.authorization;
  const token = extractBearerToken(Array.isArray(authorization) ? authorization[0] : authorization);

  if (authMode === "disabled") {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      ip,
      rateLimitKey: `ip:${ip}`,
    };
  }

  if (!token) {
    if (authMode === "required") {
      throw Object.assign(new Error("Authentication is required."), { statusCode: 401 });
    }

    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      ip,
      rateLimitKey: `ip:${ip}`,
    };
  }

  try {
    const decoded = await verifyFirebaseIdToken(token);

    return {
      isAuthenticated: true,
      userId: decoded.uid,
      email: decoded.email,
      ip,
      rateLimitKey: `uid:${decoded.uid}`,
    };
  } catch (error) {
    if (authMode === "optional" && process.env.NODE_ENV !== "production") {
      console.warn("Firebase token verification unavailable in optional dev mode:", error);
      return {
        isAuthenticated: false,
        userId: null,
        email: null,
        ip,
        rateLimitKey: `ip:${ip}`,
      };
    }

    throw Object.assign(new Error("Invalid authentication token."), { statusCode: 401 });
  }
}
