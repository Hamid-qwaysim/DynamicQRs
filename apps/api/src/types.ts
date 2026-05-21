export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  PUBLIC_SITE_URL: string;
  SHORT_LINK_BASE: string;
  JWT_SECRET?: string;
  IP_HASH_SALT?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_STARTER?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_AGENCY?: string;
  GA4_MEASUREMENT_ID?: string;
  EMAIL?: {
    send: (msg: {
      to: string;
      from: string;
      subject: string;
      html: string;
      text?: string;
      replyTo?: string;
    }) => Promise<void>;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  sessionId: string;
}

export type Variables = {
  user?: SessionUser;
};
