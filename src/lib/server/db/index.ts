import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { DATABASE_URL } from '$env/static/private';

let _db: MySql2Database<typeof schema> | null = null;

export function getDb(): MySql2Database<typeof schema> {
  if (_db) return _db;
  const url = DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  const connection = mysql.createPool(url);
  _db = drizzle(connection, { schema, mode: 'default' });
  return _db;
}

// Lazy-access proxy so DB connects on first use, not at import time
export const db: MySql2Database<typeof schema> = new Proxy({} as MySql2Database<typeof schema>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  }
});