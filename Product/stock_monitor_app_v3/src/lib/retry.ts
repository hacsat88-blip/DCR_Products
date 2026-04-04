export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  factor?: number;
  retryOn?: (error: unknown) => boolean;
}

function isHttpStatus(error: unknown, status: number): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes(`HTTP ${status}`) || error.message.includes(`${status}`);
}

function defaultRetryOn(error: unknown): boolean {
  if (isHttpStatus(error, 401) || isHttpStatus(error, 403)) return false;
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 1000;
  const factor = opts?.factor ?? 2;
  const retryOn = opts?.retryOn ?? defaultRetryOn;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !retryOn(error)) {
        throw error;
      }
      const delayMs = baseDelayMs * factor ** (attempt - 1);
      await delay(delayMs);
    }
  }
  throw lastError;
}
