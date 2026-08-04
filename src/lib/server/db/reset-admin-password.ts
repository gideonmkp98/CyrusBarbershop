import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';
import { users, sessions } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function stripQuotes(value: string | undefined): string | undefined {
  if (!value) return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function resetAdminPassword() {
  const ADMIN_EMAIL = stripQuotes(process.env.OWNER_EMAIL || process.env.MASTER_EMAIL);
  const ADMIN_PASSWORD = stripQuotes(process.env.OWNER_PASSWORD || process.env.MASTER_PASSWORD);
  const ADMIN_DISPLAY_NAME = stripQuotes(process.env.OWNER_DISPLAY_NAME || process.env.MASTER_DISPLAY_NAME);

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  if (!ADMIN_EMAIL) {
    console.error('OWNER_EMAIL or MASTER_EMAIL environment variable is not set');
    process.exit(1);
  }

  if (!ADMIN_PASSWORD) {
    console.error('OWNER_PASSWORD or MASTER_PASSWORD environment variable is not set');
    process.exit(1);
  }

  console.log(`Resetting password for ${ADMIN_EMAIL}...`);
  console.log(`Password length: ${ADMIN_PASSWORD.length}`);

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);

  if (existing.length === 0) {
    console.log(`Admin account not found. Creating ${ADMIN_EMAIL}...`);
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await db.insert(users).values({
      email: ADMIN_EMAIL,
      passwordHash,
      displayName: ADMIN_DISPLAY_NAME || 'Owner',
      role: 'owner'
    });
    console.log(`✓ Admin account created: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await db.update(users)
      .set({
        passwordHash,
        displayName: ADMIN_DISPLAY_NAME || existing[0].displayName,
        isActive: true
      })
      .where(eq(users.email, ADMIN_EMAIL));
    console.log(`✓ Password reset for: ${ADMIN_EMAIL}`);
  }

  // Verify the password was stored correctly and get the user id
  const [updated] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  if (!updated) {
    throw new Error('Could not read back the admin account after update');
  }
  const passwordValid = await verifyPassword(ADMIN_PASSWORD, updated.passwordHash);
  if (!passwordValid) {
    throw new Error('Password verification failed after reset. The stored hash does not match the password from the environment.');
  }
  console.log('✓ Stored password hash verified against environment value');

  // Invalidate existing sessions so the new password must be used
  await db.delete(sessions).where(eq(sessions.userId, updated.id));
  console.log('✓ Existing sessions cleared');

  await connection.end();
  console.log('\nDone!');
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
}

resetAdminPassword().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
