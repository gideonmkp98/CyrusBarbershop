import { mysqlTable, int, varchar, text, date, time, boolean, timestamp, decimal, mysqlEnum } from 'drizzle-orm/mysql-core';

export const services = mysqlTable('services', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  duration: int('duration').notNull().default(45),
  category: varchar('category', { length: 50 }).notNull().default('hair'),
  isSignature: boolean('is_signature').notNull().default(false),
  displayOrder: int('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const appointments = mysqlTable('appointments', {
  id: int('id').primaryKey().autoincrement(),
  serviceId: int('service_id').notNull(),
  date: date('date').notNull(),
  timeSlot: varchar('time_slot', { length: 8 }).notNull(),
  clientName: varchar('client_name', { length: 100 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientPhone: varchar('client_phone', { length: 30 }),
  notes: text('notes'),
  status: mysqlEnum('status', ['confirmed', 'completed', 'cancelled', 'no_show']).notNull().default('confirmed'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const openingHours = mysqlTable('opening_hours', {
  id: int('id').primaryKey().autoincrement(),
  dayOfWeek: int('day_of_week').notNull(),
  openTime: time('open_time').notNull(),
  closeTime: time('close_time').notNull(),
  isActive: boolean('is_active').notNull().default(true)
});

export const blockedTimes = mysqlTable('blocked_times', {
  id: int('id').primaryKey().autoincrement(),
  date: date('date').notNull(),
  timeSlot: varchar('time_slot', { length: 8 }).notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  role: mysqlEnum('role', ['master', 'staff']).notNull().default('staff'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const sessions = mysqlTable('sessions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});