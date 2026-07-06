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
      return "This Firebase project has not enabled that sign-in method yet.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before login finished.";
    case "auth/network-request-failed":
      return "Firebase could not be reached. Please check the network and try again.";
    case "auth/web-storage-unsupported":
      return "This browser blocks the local storage sign-in needs. Try opening Hina in Chrome, Edge, or Safari.";
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Sign-in did not finish. Please try again.";
  }
}
