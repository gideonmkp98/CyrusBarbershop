/**
 * Standalone seed script for Vercel deployment
 * Uses process.env directly instead of SvelteKit $env/static/private
 */
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { hashSync } from 'bcryptjs';

// Inline schema definitions to avoid SvelteKit imports
function defineSchema(db) {
  return {
    services: { tableName: 'services' },
    openingHours: { tableName: 'opening_hours' },
    users: { tableName: 'users' }
  };
}

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  const MASTER_EMAIL = process.env.MASTER_EMAIL || 'admin@cyrusbarber.com';
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Admin123!';
  const MASTER_DISPLAY_NAME = process.env.MASTER_DISPLAY_NAME || 'Master Barber';

  console.log('Connecting to database...');
  const connection = await mysql.createPool(DATABASE_URL);
  const db = drizzle(connection);

  console.log('Seeding database...\n');

  // Services - use ignore on duplicate key
  try {
    await db.execute(`
      INSERT INTO services (name, slug, description, price, duration, category, is_signature, display_order) VALUES
      ('Haarknippen', 'haarknippen', 'Een vakkundige snit op maat. Schaarwerk, tondeuse en styling. Inclusief wassen en föhnen.', '35.00', 45, 'hair', 0, 1),
      ('Fade', 'fade', 'Vloeiende overgang van huid naar haar. Verschillende fademogelijkheden met scheermesafwerking.', '45.00', 45, 'hair', 0, 2),
      ('De Klassieke', 'de-klassieke', 'Gerespecteerd klassiek werk. Hals netjes afgewerkt met warme handdoek. De standaard.', '45.00', 50, 'hair', 0, 3),
      ('Baardtrim & Vorm', 'baardtrim-vorm', 'Vakkundig trimmen en vormen naar je gezichtsstructuur. Afgewerkt met premium baardolie.', '25.00', 30, 'beard', 0, 4),
      ('Warme Scheerbeurt', 'warme-scheerbeurt', 'Klassieke scheerervaring. Stoom, zeep en scheermeswerk met de nodige finesse.', '40.00', 45, 'beard', 0, 5),
      ('Baard Design', 'baard-design', 'Fijne vorming en linenwerk. Voor wie waarde hecht aan perfecte details en vakwerk.', '30.00', 35, 'beard', 0, 6),
      ('The Works', 'the-works', 'Het volledige Cyrus-programma. Premium haarknippen of fade, baardwerk en gezichtsmassage.', '75.00', 90, 'signature', 1, 7)
      ON DUPLICATE KEY UPDATE name=VALUES(name)
    `);
    console.log('✓ Services seeded');
  } catch (err) {
    console.log('⚠️  Services may already exist');
  }

  // Opening hours (Mon=1 through Sat=6, no Sunday)
  try {
    await db.execute(`
      INSERT INTO opening_hours (day_of_week, open_time, close_time) VALUES
      (1, '09:00', '20:00'),
      (2, '09:00', '20:00'),
      (3, '09:00', '20:00'),
      (4, '09:00', '20:00'),
      (5, '09:00', '20:00'),
      (6, '10:00', '18:00')
      ON DUPLICATE KEY UPDATE day_of_week=VALUES(day_of_week)
    `);
    console.log('✓ Opening hours seeded');
  } catch (err) {
    console.log('⚠️  Opening hours may already exist');
  }

  // Master admin - check if exists first
  const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [MASTER_EMAIL]);

  if (existing.length > 0) {
    console.log(`✓ Master account already exists: ${MASTER_EMAIL}`);
  } else {
    const passwordHash = hashSync(MASTER_PASSWORD, 10);
    await db.execute(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [MASTER_EMAIL, passwordHash, MASTER_DISPLAY_NAME, 'master']
    );
    console.log(`✓ Master account created: ${MASTER_EMAIL}`);
  }

  await connection.end();

  console.log('\n✅ Seed complete!');
  console.log(`\nMaster Login Credentials:`);
  console.log(`  Email: ${MASTER_EMAIL}`);
  console.log(`  Password: ${MASTER_PASSWORD}`);
  console.log(`\n⚠️  Change the password after first login!`);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
