import bcrypt from 'bcryptjs';
import crypto from 'crypto';
// Side-effect import: validates SESSION_SECRET/DATABASE_URL/PUBLIC_SITE_URL at boot.
// Throws in production if any required env var is missing or malformed.
import './env';
import { dev } from '$app/environment';
import { db } from './db/index';
import { users, sessions } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { SESSION_SECRET } from '$env/static/private';

const SALT_ROUNDS = 12;
const SESSION_EXPIRY_DAYS = 7;
const SESSION_SECRET_MIN_LENGTH = 32;

const signingEnabled = SESSION_SECRET && SESSION_SECRET.length >= SESSION_SECRET_MIN_LENGTH;

// Env validator already throws in production when SESSION_SECRET is missing/short.
// Keep a dev-only warning for clarity.
if (!signingEnabled && dev) {
  console.warn(
    '[AUTH] SESSION_SECRET is missing or shorter than 32 characters. Session cookies will not be signed.'
  );
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, token, expiresAt });
  return token;
}

export function signSessionToken(token: string): string {
  if (!signingEnabled) return token;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
  return `${token}.${signature}`;
}

export function unsignSessionToken(signed: string): string | null {
  if (!signingEnabled) return signed;
  const parts = signed.split('.');
  if (parts.length !== 2) return null;

  const [token, signature] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    return valid ? token : null;
  } catch {
    return null;
  }
}

export async function validateSession(tokenOrSigned: string) {
  const token = unsignSessionToken(tokenOrSigned);
  if (!token) return null;

  const result = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (result.length === 0) return null;

  const { user, session } = result[0];
  if (!user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive
  };
}

export async function deleteSession(tokenOrSigned: string): Promise<void> {
  const token = unsignSessionToken(tokenOrSigned);
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, token));
}