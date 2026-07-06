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
      return "当前预览域名没有加入 Firebase 授权域名。请使用 http://localhost 打开，或在 Firebase Authentication 里添加这个域名。";
    case "auth/operation-not-allowed":
      return "这个 Firebase 项目还没有开启对应的登录方式。";
    case "auth/popup-blocked":
      return "浏览器拦截了 Google 登录弹窗。";
    case "auth/popup-closed-by-user":
      return "Google 登录窗口已关闭，登录还没有完成。";
    case "auth/network-request-failed":
      return "暂时连不上 Firebase，请检查网络后再试。";
    case "auth/web-storage-unsupported":
      return "当前浏览器阻止了登录所需的本地存储。请尝试用 Chrome、Edge 或 Safari 打开。";
    case "auth/email-already-in-use":
      return "这个邮箱已经注册过了。";
    case "auth/invalid-email":
      return "请输入正确的邮箱地址。";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "邮箱或密码不正确。";
    case "auth/weak-password":
      return "密码至少需要 8 位。";
    case "auth/too-many-requests":
      return "尝试次数太多了，请稍后再试。";
    default:
      return "登录请求没有成功，请稍后再试。";
  }
}
