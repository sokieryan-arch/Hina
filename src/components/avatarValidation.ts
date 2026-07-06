export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

export type AvatarValidationCode = "avatar_too_large" | "avatar_type_not_supported" | "missing_avatar_file";

export interface AvatarValidationError {
  code: AvatarValidationCode;
  message: string;
}

export const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function avatarExtension(type: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extensions[type] ?? "png";
}

export function validateAvatarFile(file: File | null | undefined): AvatarValidationError | null {
  if (!file) {
    return {
      code: "missing_avatar_file",
      message: "Pick an image before saving.",
    };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return {
      code: "avatar_type_not_supported",
      message: "Choose a JPG, PNG, WebP, or GIF image.",
    };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return {
      code: "avatar_too_large",
      message: "Avatar must be 10MB or smaller.",
    };
  }
  return null;
}
