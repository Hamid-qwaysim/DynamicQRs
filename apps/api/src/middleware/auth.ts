import type { MiddlewareHandler } from 'hono';
import { getCurrentUser } from '../lib/session';
import type { Env, Variables } from '../types';

export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const user = await getCurrentUser(c.env, c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  c.set('user', user);
  return next();
};

export const attachUser: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const user = await getCurrentUser(c.env, c);
  if (user) c.set('user', user);
  return next();
};
