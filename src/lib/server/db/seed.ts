import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';
import { services, openingHours, users } from './schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function seed() {
  const OWNER_EMAIL = process.env.OWNER_EMAIL || process.env.MASTER_EMAIL || 'admin@cyrusbarber.com';
  const OWNER_PASSWORD = process.env.OWNER_PASSWORD || process.env.MASTER_PASSWORD || 'Admin123!';
  const OWNER_DISPLAY_NAME = process.env.OWNER_DISPLAY_NAME || process.env.MASTER_DISPLAY_NAME || 'Owner';

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Seeding database...');

  // Create direct mysql connection for clearing tables
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  // Clear existing data to prevent duplicates
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.delete(services).execute();
  await db.delete(openingHours).execute();
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

  // Services - use ignore on duplicate key
  await db.insert(services).values([
    { name: 'Haarknippen', slug: 'haarknippen', description: 'Een vakkundige snit op maat. Schaarwerk, tondeuse en styling. Inclusief wassen en föhnen.', price: '35.00', duration: 45, category: 'hair', isSignature: false, displayOrder: 1 },
    { name: 'Fade', slug: 'fade', description: 'Vloeiende overgang van huid naar haar. Verschillende fademogelijkheden met scheermesafwerking.', price: '45.00', duration: 45, category: 'hair', isSignature: false, displayOrder: 2 },
    { name: 'De Klassieke', slug: 'de-klassieke', description: 'Gerespecteerd klassiek werk. Hals netjes afgewerkt met warme handdoek. De standaard.', price: '45.00', duration: 50, category: 'hair', isSignature: false, displayOrder: 3 },
    { name: 'Baardtrim & Vorm', slug: 'baardtrim-vorm', description: 'Vakkundig trimmen en vormen naar je gezichtsstructuur. Afgewerkt met premium baardolie.', price: '25.00', duration: 30, category: 'beard', isSignature: false, displayOrder: 4 },
    { name: 'Warme Scheerbeurt', slug: 'warme-scheerbeurt', description: 'Klassieke scheerervaring. Stoom, zeep en scheermeswerk met de nodige finesse.', price: '40.00', duration: 45, category: 'beard', isSignature: false, displayOrder: 5 },
    { name: 'Baard Design', slug: 'baard-design', description: 'Fijne vorming en linenwerk. Voor wie waarde hecht aan perfecte details en vakwerk.', price: '30.00', duration: 35, category: 'beard', isSignature: false, displayOrder: 6 },
    { name: 'The Works', slug: 'the-works', description: 'Het volledige Cyrus-programma. Premium haarknippen of fade, baardwerk en gezichtsmassage.', price: '75.00', duration: 90, category: 'signature', isSignature: true, displayOrder: 7 }
  ]);

  console.log('✓ Services seeded');

  // Opening hours (Mon=1 through Sat=6, Sun=7)
  await db.insert(openingHours).values([
    { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isActive: true },
    { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isActive: true },
    { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isActive: true },
    { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isActive: true },
    { dayOfWeek: 5, openTime: '09:00', closeTime: '20:00', isActive: true },
    { dayOfWeek: 6, openTime: '10:00', closeTime: '18:00', isActive: true },
    { dayOfWeek: 7, openTime: '00:00', closeTime: '00:00', isActive: false }
  ]);

  console.log('✓ Opening hours seeded');

  // Owner admin - check if exists first, then create or update
  const existingOwner = await db.select().from(users).where(eq(users.email, OWNER_EMAIL)).limit(1);

  if (existingOwner.length > 0) {
    console.log(`✓ Owner account already exists: ${OWNER_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(OWNER_PASSWORD);
    await db.insert(users).values({
      email: OWNER_EMAIL,
      passwordHash,
      displayName: OWNER_DISPLAY_NAME,
      role: 'owner'
    });
    console.log(`✓ Owner account created: ${OWNER_EMAIL}`);
  }

  // Close connection
  await connection.end();

  console.log('\nSeed complete!');
  console.log(`\nOwner Login Credentials:`);
  console.log(`  Email: ${OWNER_EMAIL}`);
  console.log(`  Password: ${OWNER_PASSWORD}`);
  console.log(`\n⚠️  Change the password after first login!`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});