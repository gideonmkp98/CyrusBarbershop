import 'dotenv/config';
import { db } from './src/lib/server/db/index';
import { users } from './src/lib/server/db/schema';
import { verifyPassword } from './src/lib/server/auth';
import { eq } from 'drizzle-orm';

async function debug() {
  console.log('=== Debug Login Issue ===\n');

  // Check database connection
  try {
    const testResult = await db.select().from(users).limit(1);
    console.log('✓ Database connection OK');
  } catch (err) {
    console.error('✗ Database connection FAILED:', err);
    return;
  }

  // List all users
  const allUsers = await db.select().from(users);
  console.log('\n=== Users in database ===');
  if (allUsers.length === 0) {
    console.log('NO USERS FOUND - need to run npm run db:seed');
  } else {
    allUsers.forEach(u => {
      console.log(`  ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`);
    });
  }

  // Test with the expected credentials
  const MASTER_EMAIL = process.env.MASTER_EMAIL || 'admin@cyrusbarber.com';
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Admin123!';

  console.log(`\n=== Testing login ===`);
  console.log(`Trying email: ${MASTER_EMAIL}`);
  console.log(`Trying password: ${MASTER_PASSWORD}`);

  const result = await db.select().from(users).where(eq(users.email, MASTER_EMAIL)).limit(1);

  if (result.length === 0) {
    console.log('✗ User NOT FOUND in database');
    console.log('  → Run: npm run db:seed');
    return;
  }

  const user = result[0];
  console.log(`✓ User found: ${user.email}`);
  console.log(`  Password hash stored: ${user.passwordHash.substring(0, 20)}...`);
  console.log(`  isActive: ${user.isActive}`);

  const valid = await verifyPassword(MASTER_PASSWORD, user.passwordHash);
  console.log(`\nPassword verification result: ${valid ? '✓ VALID' : '✗ INVALID'}`);

  if (!valid) {
    console.log('\n=== PASSWORD MISMATCH ===');
    console.log('The password hash in database does not match the expected password.');
    console.log('Solutions:');
    console.log('  1. Re-run seed: npm run db:seed (if user exists, update MASTER_PASSWORD env)');
    console.log('  2. Or update the password hash manually');
  }
}

debug().catch(console.error);
