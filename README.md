# Cyrus Barbershop

SvelteKit web application voor barbershop met online booking en admin dashboard.

## Features

- Online afspraak boeken
- Admin dashboard voor beheer
- Service catalogus
- Openingstijden beheer
- Afspraak status tracking

## Tech Stack

- **Framework**: SvelteKit 2 met Svelte 5
- **Styling**: Tailwind CSS v4
- **Database**: MySQL via Drizzle ORM
- **Auth**: Cookie-based sessions met bcryptjs
- **Validatie**: Zod schemas

## Quick Start

### Ontwikkelomgeving

```bash
# Installeer dependencies
npm install

# Kopieer environment template
cp .env.example .env

# Pas .env aan met je lokale database gegevens

# Genereer migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Seed de database met initiële data
npm run db:seed

# Start development server
npm run dev
```

### Beschikbare Commands

```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build voor productie
npm run preview      # Preview productie build
npm run db:generate  # Genereer Drizzle migrations
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database met initiële data
```

## Deployment

Zie [DEPLOYMENT.md](./DEPLOYMENT.md) voor gedetailleerde instructies voor GitHub en Vercel deployment.

## Project Structuur

```
barbershop-sveltekit/
├── src/
│   ├── lib/
│   │   ├── components/     # Herbruikbare Svelte componenten
│   │   ├── server/         # Server-only code (auth, db, schema)
│   │   ├── stores/         # Svelte stores
│   │   ├── actions/        # Svelte actions
│   │   └── utils/          # Validatie schemas
│   └── routes/
│       ├── api/            # JSON API endpoints
│       ├── admin/          # Admin dashboard routes
│       └── +page.svelte    # Client-facing pages
├── drizzle/                # Database migrations
├── scripts/                # Deployment scripts
├── .env.example            # Environment variable template
├── vercel.json             # Vercel configuratie
└── DEPLOYMENT.md           # Deployment handleiding
```

## Database Schema

- `services` - Bookbare services met prijzen en duur
- `appointments` - Afspraken met client info en status
- `opening_hours` - Openingstijden per dag
- `blocked_times` - Geblokkeerde tijdsloten
- `users` - Admin/staff accounts
- `sessions` - Auth tokens met expiry

## License

Private - Cyrus Barbershop
