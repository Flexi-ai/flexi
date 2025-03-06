import { Context, Next } from 'hono';

export async function basicAuth(c: Context, next: Next) {
  const username = process.env.API_USERNAME;
  const password = process.env.API_PASSWORD;

  if (!username || !password) {
    console.error('Authentication credentials not properly configured');
    return c.text('Server configuration error', 500);
  }

  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    c.header('WWW-Authenticate', 'Basic');
    return c.text('Unauthorized', 401);
  }

  const [type, credentials] = authHeader.split(' ');

  if (type !== 'Basic') {
    c.header('WWW-Authenticate', 'Basic');
    return c.text('Unauthorized', 401);
  }

  const [providedUsername, providedPassword] = Buffer.from(credentials, 'base64')
    .toString()
    .split(':');

  if (providedUsername !== username || providedPassword !== password) {
    c.header('WWW-Authenticate', 'Basic');
    return c.text('Unauthorized', 401);
  }

  await next();
}
