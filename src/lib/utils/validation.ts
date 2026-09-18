import { z } from 'zod';

export const appointmentSchema = z.object({
  serviceId: z.number().int().positive(),
  staffId: z.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(2).max(100),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().regex(/^[\d\s\-\+\(\)]{6,20}$/, 'Ongeldig telefoonnummer').optional(),
  notes: z.string().max(1000).optional(),
  addOnIds: z.array(z.number().int().positive()).optional().default([])
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  message: z.string().trim().min(3).max(2000),
  // Anti-spam: honeypot must be empty, render_time must be >= 1500ms (bots
  // fill the form instantly or skip the field). Both are validated server-side.
  hp: z.string().max(0).optional().default(''),
  renderTime: z.number().int().min(1500).optional()
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

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum');

export const timeOffCreateSchema = z.object({
  staffId: z.number().int().positive().optional(),
  startDate: dateKeySchema,
  endDate: dateKeySchema,
  reason: z.string().trim().max(500).optional().default(''),
  direct: z.boolean().optional().default(false),
  confirmConflicts: z.boolean().optional().default(false)
});

export const timeOffReviewSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['approved', 'rejected']),
  reviewerNote: z.string().trim().max(500).optional().default(''),
  confirmConflicts: z.boolean().optional().default(false)
});

export const appointmentRescheduleSchema = z.object({
  id: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  date: dateKeySchema,
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/)
});
