export class OperationTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "OperationTimeoutError";
  }
}

export function isOperationTimeoutError(error: unknown): error is OperationTimeoutError {
  return error instanceof OperationTimeoutError
    || (Boolean(error)
      && typeof error === "object"
      && (error as { name?: unknown }).name === "OperationTimeoutError");
}

export async function withTimeout<T>(operation: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new OperationTimeoutError(label, ms)), ms);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
