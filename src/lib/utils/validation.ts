import { z } from 'zod';

export const appointmentSchema = z.object({
  serviceId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(2).max(100),
  clientEmail: z.string().email(),
  clientPhone: z.string().max(30).optional(),
  notes: z.string().max(1000).optional()
});

export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Minimaal één hoofdletter').regex(/[a-z]/, 'Minimaal één kleine letter').regex(/[0-9]/, 'Minimaal één cijfer'),
  displayName: z.string().min(2).max(100)
});