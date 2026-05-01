import 'dotenv/config';
import { db } from './index';
import { services, openingHours, users } from './schema';
import { hashPassword } from '../auth';
import { eq } from 'drizzle-orm';

async function seed() {
  const MASTER_EMAIL = process.env.MASTER_EMAIL || 'admin@cyrusbarber.com';
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Admin123!';
  const MASTER_DISPLAY_NAME = process.env.MASTER_DISPLAY_NAME || 'Master Barber';

  console.log('Seeding database...');

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

  // Opening hours (Mon=1 through Sat=6, no Sunday)
  await db.insert(openingHours).values([
    { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00' },
    { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00' },
    { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00' },
    { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00' },
    { dayOfWeek: 5, openTime: '09:00', closeTime: '20:00' },
    { dayOfWeek: 6, openTime: '10:00', closeTime: '18:00' }
  ]);

  console.log('✓ Opening hours seeded');

  // Master admin - check if exists first, then create or update
  const existingMaster = await db.select().from(users).where(eq(users.email, MASTER_EMAIL)).limit(1);

  if (existingMaster.length > 0) {
    console.log(`✓ Master account already exists: ${MASTER_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(MASTER_PASSWORD);
    await db.insert(users).values({
      email: MASTER_EMAIL,
      passwordHash,
      displayName: MASTER_DISPLAY_NAME,
      role: 'master'
    });
    console.log(`✓ Master account created: ${MASTER_EMAIL}`);
  }

  console.log('\nSeed complete!');
  console.log(`\nMaster Login Credentials:`);
  console.log(`  Email: ${MASTER_EMAIL}`);
  console.log(`  Password: ${MASTER_PASSWORD}`);
  console.log(`\n⚠️  Change the password after first login!`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});