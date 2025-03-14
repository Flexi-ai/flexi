import { Context, Next } from 'hono';
import { Logger } from '../utils/logger';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// Define interfaces for request and response data
interface RequestData {
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

interface FormDataFile {
  filename: string;
  type: string;
  size: number;
}

type LogData = Record<string, unknown> & {
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  status: number;
  responseTime: string;
  contentLength: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
};

export async function loggingMiddleware(ctx: Context, next: Next) {
  // Check if logging is enabled
  const isLoggingEnabled = process.env.LOGGING_ENABLED?.toLowerCase() !== 'false';

  if (!isLoggingEnabled) {
    return next();
  }

  try {
    // Store request start time
    const requestStartTime = Date.now();
    const requestData = await captureRequestData(ctx);

    // Store the original json method
    const originalJson = ctx.json.bind(ctx);

    // Override the json method to capture the response
    // @ts-expect-error - We're intentionally overriding the json method with a compatible implementation
    ctx.json = async function (
      body: Record<string, unknown>,
      status?: ContentfulStatusCode,
      headers?: Record<string, string>
    ) {
      try {
        // Calculate content length before sending response
        const contentLength = calculateContentLength(body);

        // Set content-length header
        if (headers) {
          headers['content-length'] = contentLength.toString();
        } else {
          headers = { 'content-length': contentLength.toString() };
        }

        // Call the original json method
        const response = await originalJson(body, status, headers);

        // Calculate response time
        const responseTime = Date.now() - requestStartTime;

        // Log combined request/response data
        const logData: LogData = {
          timestamp: new Date().toISOString(),
          method: ctx.req.method,
          url: ctx.req.url,
          headers: requestData.headers,
          status: status || ctx.res.status,
          responseTime: `${responseTime}ms`,
          contentLength: `${contentLength}`,
          request: requestData.body || {},
          response: body || {},
        };
        Logger.info('Request/Response', logData);

        return response;
      } catch (error) {
        Logger.error('Error in response logging', {
          error: error instanceof Error ? error.message : String(error),
        });
        return originalJson(body, status, headers);
      }
    };

    await next();
  } catch (error) {
    Logger.error('Error in logging middleware', {
      error: error instanceof Error ? error.message : String(error),
      path: ctx.req.path,
      method: ctx.req.method,
    });
    throw error;
  }
}

function calculateContentLength(body: Record<string, unknown>): number {
  if (!body) return 0;

  // Convert body to JSON string
  const jsonString = JSON.stringify(body);

  // Calculate length in bytes
  return new TextEncoder().encode(jsonString).length;
}

async function captureRequestData(ctx: Context): Promise<RequestData> {
  const headers: Record<string, string> = {};
  ctx.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: Record<string, unknown> = {};
  if (['POST', 'PUT', 'PATCH'].includes(ctx.req.method)) {
    const contentType = ctx.req.header('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        body = (await ctx.req.json()) as Record<string, unknown>;
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await ctx.req.formData();
        const formDataObj: Record<string, unknown> = {};
        formData.forEach((value, key) => {
          if (value instanceof File) {
            formDataObj[key] = {
              filename: value.name,
              type: value.type,
              size: value.size,
            } as FormDataFile;
          } else {
            formDataObj[key] = value;
          }
        });
        body = formDataObj;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await ctx.req.formData();
        const formDataObj: Record<string, string> = {};
        formData.forEach((value, key) => {
          formDataObj[key] = value.toString();
        });
        body = formDataObj;
      }
    } catch (error) {
      Logger.warn('Failed to parse request body', { error: String(error) });
    }
  }

  return { headers, body };
}
