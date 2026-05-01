# Deployment Guide

## GitHub Push

1. Initialize git (als dat nog niet gebeurd is):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Voeg een remote repository toe:
   ```bash
   git remote add origin https://github.com/jouw-username/cyrus-barbershop.git
   git branch -M main
   git push -u origin main
   ```

## Vercel Deployment

### Stap 1: Environment Variables instellen in Vercel

Ga in de Vercel dashboard naar je project → Settings → Environment Variables en voeg toe:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/cyrus` |
| `SESSION_SECRET` | Random string (min. 32 chars) | `x8K#2mP9$vL5nQ7wR3tY6uI0oA4sD8fG2` |
| `MASTER_EMAIL` | Admin login email | `admin@cyrusbarber.com` |
| `MASTER_PASSWORD` | Admin login password | `YourSecurePassword123!` |
| `PUBLIC_SITE_URL` | Your Vercel URL | `https://cyrus-barbershop.vercel.app` |

**Let op:** Deze variabelen moeten zowel voor **Production** als **Preview** worden ingesteld.

### Stap 2: Database connectie

Zorg dat je MySQL database bereikbaar is vanaf Vercel:
- Gebruik een cloud database (bijv. PlanetScale, AWS RDS, of een externe MySQL host)
- Lokale `localhost` databases werken **niet** met Vercel

### Stap 3: Deployen

Nadat je git pusht naar `main`, deployt Vercel automatisch:

```bash
git push origin main
```

Het deployment script runt automatisch:
1. `npm run db:migrate` - Database migrations
2. `npm run db:seed` - Initiële data (services, opening hours, master user)
3. `npm run build` - SvelteKit build

### Stap 4: Controleren

Na deployment:
1. Ga naar je Vercel URL
2. Log in met de master credentials op `/admin/login`
3. Change het wachtwoord na de eerste login!

## Lokaal Ontwikkelen

1. Kopieer `.env.example` naar `.env`:
   ```bash
   cp .env.example .env
   ```

2. Pas de waarden aan voor je lokale setup

3. Installeer dependencies en start:
   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

## Handige Commands

```bash
# Database migrations genereren (na schema wijzigingen)
npm run db:generate

# Migrations runnen
npm run db:migrate

# Database seeden (initiële data)
npm run db:seed

# Build voor productie
npm run build
```
