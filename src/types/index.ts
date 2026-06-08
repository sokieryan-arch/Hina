/**
 * Type definitions for API requests and responses
 */

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  correction?: string;
  insight?: string;
}

export interface TTSRequest {
  text: string;
}

export interface TTSResponse {
  audio: string;
  mimeType: string;
}

/**
 * Error types for API responses
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface ErrorResponse {
  error: string;
  code?: number | string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}
