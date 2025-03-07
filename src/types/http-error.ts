/**
 * Custom HTTP Response Error class that extends the standard Error
 * with additional properties for HTTP status and response data.
 */
export class HTTPResponseError extends Error {
  status?: number;
  response?: {
    data?: unknown;
  };
  cause?: unknown;

  constructor(
    message: string,
    options?: {
      status?: number;
      response?: {
        data?: unknown;
      };
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'HTTPResponseError';
    this.status = options?.status;
    this.response = options?.response;
    this.cause = options?.cause;
  }
}
