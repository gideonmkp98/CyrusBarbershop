import { db } from '$lib/server/db/index';
import { openingHours } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET: Load all opening hours
export const GET: RequestHandler = async ({ locals }) => {
  if (locals.user?.role !== 'owner' && locals.user?.role !== 'manager') {
    return new Response(JSON.stringify({ error: 'Toegang geweigerd' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const hours = await db.select().from(openingHours).orderBy(openingHours.dayOfWeek);

  return new Response(JSON.stringify({ hours }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// POST: Update or create opening hours for a specific day
export const POST: RequestHandler = async ({ request, locals }) => {
  if (locals.user?.role !== 'owner') {
    return new Response(JSON.stringify({ error: 'Alleen owner kan openingstijden wijzigen' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const { dayOfWeek, openTime, closeTime, isActive } = body;

  // Validation
  if (dayOfWeek === undefined) {
    return new Response(JSON.stringify({ error: 'Ontbrekende dag' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (typeof dayOfWeek !== 'number' || dayOfWeek < 1 || dayOfWeek > 7) {
    return new Response(JSON.stringify({ error: 'Dag moet een getal tussen 1 en 7 zijn' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If day is closed, use placeholder times
  let finalOpenTime = openTime;
  let finalCloseTime = closeTime;

  if (isActive === false) {
    finalOpenTime = '00:00';
    finalCloseTime = '00:00';
  } else {
    // Only validate time format if day is active
    if (openTime === undefined || closeTime === undefined) {
      return new Response(JSON.stringify({ error: 'Ontbrekende tijdvelden' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
      return new Response(JSON.stringify({ error: 'Ongeldig tijdformaat. Gebruik HH:MM' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate closeTime is after openTime
    if (closeTime <= openTime) {
      return new Response(JSON.stringify({ error: 'Sluitingstijd moet na openingstijd liggen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    // Check if entry exists for this day
    const existing = await db
      .select()
      .from(openingHours)
      .where(eq(openingHours.dayOfWeek, dayOfWeek))
      .limit(1);

    if (existing.length > 0) {
      // Update existing entry
      await db
        .update(openingHours)
        .set({ openTime: finalOpenTime, closeTime: finalCloseTime, isActive: isActive ?? true })
        .where(eq(openingHours.dayOfWeek, dayOfWeek));
    } else {
      // Create new entry
      await db.insert(openingHours).values({ dayOfWeek, openTime: finalOpenTime, closeTime: finalCloseTime, isActive: isActive ?? true });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Database fout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Remove opening hours for a specific day
export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (locals.user?.role !== 'owner') {
    return new Response(JSON.stringify({ error: 'Alleen owner kan openingstijden verwijderen' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const { dayOfWeek } = body;

  if (typeof dayOfWeek !== 'number' || dayOfWeek < 1 || dayOfWeek > 7) {
    return new Response(JSON.stringify({ error: 'Ongeldige dag' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await db.delete(openingHours).where(eq(openingHours.dayOfWeek, dayOfWeek));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Verwijderen mislukt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
