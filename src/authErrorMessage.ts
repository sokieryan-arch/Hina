type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
};

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as AuthErrorLike).code;
    if (typeof code === "string") return code;
  }
  return "";
}

export function isPopupFallbackError(error: unknown): boolean {
  return [
    "auth/popup-blocked",
    "auth/cancelled-popup-request",
    "auth/web-storage-unsupported",
  ].includes(getAuthErrorCode(error));
}

export function formatAuthErrorMessage(error: unknown): string {
  switch (getAuthErrorCode(error)) {
    case "auth/unauthorized-domain":
      return "This preview domain is not authorized in Firebase. Open the preview with http://localhost or add this domain in Firebase Authentication.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled for this Firebase project yet.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before login finished.";
    case "auth/network-request-failed":
      return "Google sign-in could not reach Firebase. Please check the network and try again.";
    case "auth/web-storage-unsupported":
      return "This browser blocks the storage Google sign-in needs. Try opening Hina in Chrome, Edge, or Safari.";
    default:
      if (error && typeof error === "object") {
        const message = (error as AuthErrorLike).message;
        if (typeof message === "string" && message.trim()) return message;
      }
      return "Google sign-in failed. Please try again.";
  }
}
