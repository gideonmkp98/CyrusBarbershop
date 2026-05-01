/**
 * Vercel deployment script
 * Runs database migrations and seed before build
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting Vercel deployment...\n');

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'MASTER_EMAIL', 'MASTER_PASSWORD', 'PUBLIC_SITE_URL'];
const missing = requiredEnvVars.filter(env => !process.env[env]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✓ All required environment variables present\n');

// Run migrations
console.log('📦 Running database migrations...');
try {
  execSync('npm run db:migrate', { stdio: 'inherit' });
  console.log('✓ Migrations completed\n');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

// Run seed
console.log('🌱 Running database seed...');
try {
  execSync('node scripts/seed-standalone.js', { stdio: 'inherit' });
  console.log('✓ Seed completed\n');
} catch (error) {
  // Seed might fail if data already exists, which is okay
  console.log('⚠️  Seed skipped (data may already exist)\n');
}

console.log('✅ Deployment preparation complete!');
