# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cyrus Barbershop - a SvelteKit web application with online booking, admin dashboard, and MySQL database.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with initial data
```

## Architecture

- **Framework**: SvelteKit 2 with Svelte 5
- **Styling**: Tailwind CSS v4
- **Database**: MySQL via Drizzle ORM
- **Auth**: Cookie-based sessions with bcryptjs
- **Validation**: Zod schemas

### Directory Structure

- `src/routes/` - SvelteKit file-based routing
  - `+page.svelte` - Client-facing pages (home, about, services, contact, booking)
  - `+page.server.ts` - Server load functions and form actions
  - `api/` - JSON API endpoints (appointments, services, availability, contact, logout)
  - `admin/` - Protected admin dashboard (login, users, appointments management)
- `src/lib/` - Shared modules
  - `server/` - Server-only code (auth, db, env validation)
  - `components/` - Reusable Svelte components
  - `stores/` - Svelte stores (scroll, mobileMenu)
  - `actions/` - Svelte actions (reveal for scroll animations)
  - `utils/` - Validation schemas

### Key Patterns

- **Session auth**: `hooks.server.ts` validates `session_token` cookie, populates `event.locals.user`
- **Admin protection**: Routes under `/admin/*` redirect to `/admin/login` if not authenticated
- **Database**: Lazy connection via `db` proxy in `src/lib/server/db/index.ts` - avoids connect-on-import
- **Validation**: Zod schemas in `src/lib/utils/validation.ts` for appointment, contact, login, user creation
- **API responses**: Return `Response` objects with JSON body and appropriate status codes (200, 201, 400, 401, 403, 409)

### Database Schema

- `services` - Bookable services with pricing, duration, categories
- `appointments` - Bookings with service, date, timeSlot, client info, status
- `opening_hours` - Business hours by day of week
- `blocked_times` - Unavailable time slots
- `users` - Admin/staff accounts with role (master/staff)
- `sessions` - Auth tokens with expiry

### Environment Variables

Required: `DATABASE_URL`, `SESSION_SECRET`, `MASTER_EMAIL`, `MASTER_PASSWORD`, `PUBLIC_SITE_URL`
