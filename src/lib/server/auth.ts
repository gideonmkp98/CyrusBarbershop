import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db/index';
import { users, sessions } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const SESSION_EXPIRY_DAYS = 7;

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

export async function validateSession(token: string) {
  const result = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (result.length === 0) return null;

  const { user, session } = result[0];
  if (!user.isActive) return null;

  return user;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}