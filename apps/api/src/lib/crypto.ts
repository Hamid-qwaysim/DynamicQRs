/**
 * Web Crypto helpers - Cloudflare Workers compatible.
 * No Node.js dependencies.
 */

const enc = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function b64encode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    KEY_BYTES * 8,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64encode(salt)}$${b64encode(new Uint8Array(bits))}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iters = Number(parts[1]);
  const salt = b64decode(parts[2]);
  const expected = b64decode(parts[3]);
  if (!iters || expected.length === 0) return false;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iters },
    keyMaterial,
    expected.length * 8,
  );
  const got = new Uint8Array(bits);
  if (got.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
  return diff === 0;
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${ip}`));
  return b64encode(new Uint8Array(buf)).replace(/=+$/, '').slice(0, 22);
}

export async function hashApiKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(key));
  return b64encode(new Uint8Array(buf)).replace(/[+/=]/g, (c) =>
    ({ '+': '-', '/': '_', '=': '' })[c] || c,
  );
}

const SAFE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

export function generateShortCode(length = 7): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let s = '';
  for (let i = 0; i < length; i++) {
    s += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  }
  return s;
}

export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return b64encode(bytes).replace(/[+/=]/g, (c) =>
    ({ '+': '-', '/': '_', '=': '' })[c] || c,
  );
}

export function generateId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

export function generateApiKey(): { key: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const body = b64encode(bytes).replace(/[+/=]/g, (c) =>
    ({ '+': '-', '/': '_', '=': '' })[c] || c,
  );
  const prefix = `dqrl_${body.slice(0, 6)}`;
  return { key: `${prefix}_${body.slice(6)}`, prefix };
}
