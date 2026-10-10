const NATIVE_APP_ORIGINS = new Set([
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
]);

export const NATIVE_APP_CORS_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
export const NATIVE_APP_CORS_HEADERS = "Authorization,Content-Type";

export function getAllowedNativeAppOrigin(origin: string | undefined) {
  return origin && NATIVE_APP_ORIGINS.has(origin) ? origin : null;
}
