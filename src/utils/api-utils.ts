import { Express, Request, Response } from 'express';
import { APIError, RetryConfig } from '@/src/types/index';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
};

/**
 * Parses retry delay from error message if available
 * @param errorMessage - The error message to parse
 * @returns The parsed delay in milliseconds, or null if not found
 */
function parseRetryDelay(errorMessage: string): number | null {
  const match = errorMessage.match(/retry in ([\d.]+)s/);
  if (match && match[1]) {
    return Math.ceil(parseFloat(match[1])) * 1000 + 500;
  }
  return null;
}

/**
 * Determines if an error is retryable based on status or message
 * @param error - The error to check
 * @param operation - The operation that failed ('chat' or 'tts')
 * @returns true if the error is retryable
 */
function isRetryableError(error: unknown, operation: string): boolean {
  if (!(error instanceof Error)) return false;

  const errorStr = error.toString();
  const isRateLimitOrUnavailable =
    errorStr.includes('UNAVAILABLE') ||
    errorStr.includes('RESOURCE_EXHAUSTED') ||
    errorStr.includes('429') ||
    errorStr.includes('503') ||
    errorStr.includes('Quota exceeded');

  // Only retry on rate limits for both operations
  return isRateLimitOrUnavailable;
}

/**
 * Executes a function with automatic retry logic
 * @param operation - The operation name (for logging)
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns The result of the operation
 */
export async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  let retriesLeft = config.maxRetries;

  while (retriesLeft > 0) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error, operation)) {
        throw error;
      }

      retriesLeft--;
      if (retriesLeft === 0) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Calculate delay
      let delay = config.initialDelayMs * (config.maxRetries - retriesLeft);
      const parsedDelay = parseRetryDelay(lastError.message);

      if (parsedDelay !== null) {
        // If the required delay is larger than maxDelayMs, fail fast
        if (parsedDelay > config.maxDelayMs) {
          const error: APIError = new APIError(
            429,
            'RATE_LIMITED',
            `The AI service is temporarily overloaded. Please try again in ${Math.ceil(
              parsedDelay / 1000
            )}s.`
          );
          throw error;
        }
        delay = parsedDelay;
      }

      console.log(
        `${operation} failed, retrying in ${delay}ms... (${retriesLeft} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${operation} failed after all retries`);
}

/**
 * Handles errors and returns appropriate HTTP response
 * @param error - The error that occurred
 * @param res - Express response object
 * @param operation - The operation name (for logging)
 */
export function handleError(
  error: unknown,
  res: Response,
  operation: string
): void {
  console.error(`${operation} Error:`, error);

  if (error instanceof APIError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.errorCode,
    });
    return;
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('Invalid messages format')) {
      res.status(400).json({
        error: 'Invalid messages format. Expected array of messages.',
        code: 'INVALID_INPUT',
      });
      return;
    }

    if (error.message.includes('Missing text')) {
      res.status(400).json({
        error: 'Missing required text parameter.',
        code: 'MISSING_INPUT',
      });
      return;
    }
  }

  // Default error response
  res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_ERROR',
  });
}

/**
 * Validates request body has required fields
 * @param data - The data to validate
 * @param requiredFields - Array of required field names
 * @throws Error if validation fails
 */
export function validateRequestBody(
  data: unknown,
  requiredFields: string[]
): asserts data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Request body must be an object');
  }

  const obj = data as Record<string, unknown>;
  for (const field of requiredFields) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}
