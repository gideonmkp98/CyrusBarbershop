import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

// Exercise real handlers with an isolated database adapter; never touch customer data.
let responses: any[][] = [];
let writes: any[] = [];
let filters: string[] = [];
let locks = 0;
let failSessionDelete = false;
const dialect = new MySqlDialect();
const database: any = {
  select() {
    assert.ok(responses.length, 'Unexpected read');
    const rows = responses.shift();
    const query = {
      from() { return query; },
      where(condition: any) { filters.push(dialect.sqlToQuery(condition).sql); return query; },
      limit() { return query; },
      for() { locks++; return query; },
      then(resolve: any) { return Promise.resolve(rows).then(resolve); }
    };
    return query;
  },
  update(table: any) {
    return { set(values: any) { return { async where() { writes.push({ type: 'update', table, values }); } }; } };
  },
  delete(table: any) {
    return { async where() {
      if (failSessionDelete) throw new Error('Simulated session storage failure');
      writes.push({ type: 'delete', table });
    } };
  },
  insert(table: any) {
    return { async values(values: any) { writes.push({ type: 'insert', table, values }); } };
  },
  async transaction(run: any) {
    const before = writes.slice();
    try { return await run(database); } catch (error) { writes = before; throw error; }
  }
};
(globalThis as any).__userTestDb = database;
const server = await createServer({
  configFile: false, server: { middlewareMode: true },
  resolve: { alias: { $lib: resolve('src/lib') } },
  plugins: [{
    name: 'isolated-user-database', enforce: 'pre',
    resolveId(id) {
      const path = id.replaceAll('\\', '/');
      if (/\/lib\/server\/db(?:\/index)?$/.test(path)) return '\0test-db';
      if (path.endsWith('/lib/server/auth')) return '\0test-auth';
    },
    load(id) {
      if (id === '\0test-db') return 'export const db = globalThis.__userTestDb;';
      if (id === '\0test-auth') return 'export const hashPassword = async () => "test-hash";';
    }
  }]
});
let passed = 0;
try {
  const { changeUserLifecycle, shopDateTime } = await server.ssrLoadModule('/src/lib/server/user-lifecycle.ts');
  const { POST, DELETE } = await server.ssrLoadModule('/src/routes/admin/api/users/+server.ts');
  const { users, sessions } = await server.ssrLoadModule('/src/lib/server/db/schema.ts');
  const target = { id: 12, role: 'staff', email: 'sam@example.com', displayName: 'Sam', isActive: true };
  async function check(name: string, run: () => Promise<void>) {
    responses = []; writes = []; filters = []; locks = 0; failSessionDelete = false;
    await run();
    assert.equal(responses.length, 0);
    console.log(`PASS ${name}`); passed++;
  }
  const request = (method: string, body: any, role: string | null = 'owner') => ({
    request: new Request('http://localhost/admin/api/users', { method, body: JSON.stringify(body) }),
    locals: { user: role ? { id: 1, role } : null }
  });
  await check('soft deletion keeps identity and frees the original email', async () => {
    responses = [[target], []];
    await changeUserLifecycle('owner', 12, 'delete');
    assert.equal(locks, 2);
    assert.match(filters[0], /deleted_at.*is null/);
    assert.match(filters[1], /status/);
    assert.equal(writes[0].table, users);
    const values = writes[0].values;
    assert.equal(values.isActive, false);
    assert.ok(values.deletedAt instanceof Date);
    assert.equal(values.passwordHash, '');
    assert.match(values.email, /^deleted-12-.+@deleted\.invalid$/);
    assert.notEqual(values.email, target.email);
    assert.equal(values.id, undefined);
    assert.equal(values.displayName, undefined);
    assert.equal(writes[1].table, sessions);
    assert.equal(writes.length, 2); // no appointments/rosters/history deleted

    responses = [[{ id: 99 }]];
    const response = await POST(request('POST', { email: target.email, password: 'NewPassword123!', displayName: 'Nieuwe Sam' }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, 99);
    assert.equal(writes[2].values.email, target.email);
    assert.equal(writes[2].values.role, 'staff');
  });
  await check('future appointments block deletion with a useful conflict', async () => {
    responses = [[target], [{ id: 8 }, { id: 9 }]];
    const response = await DELETE(request('DELETE', { id: 12 }));
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /2 toekomstige/);
    assert.equal(writes.length, 0);
  });
  await check('deactivation revokes sessions without freeing email or checking appointments', async () => {
    responses = [[target]];
    await changeUserLifecycle('manager', 12, 'deactivate');
    assert.deepEqual(writes[0].values, { isActive: false });
    assert.equal(writes[1].table, sessions);
  });
  await check('reactivation preserves account identity', async () => {
    responses = [[target]];
    await changeUserLifecycle('owner', 12, 'activate');
    assert.deepEqual(writes[0].values, { isActive: true });
    assert.equal(writes.length, 1);
  });
  for (const action of ['delete', 'activate', 'deactivate']) {
    await check(`deleted accounts cannot ${action}`, async () => {
      responses = [[]];
      await assert.rejects(changeUserLifecycle('owner', 12, action), { status: 404 });
      assert.match(filters[0], /deleted_at.*is null/);
      assert.equal(writes.length, 0);
    });
  }
  for (const [actor, role] of [['owner', 'owner'], ['manager', 'manager']]) {
    await check(`${actor} cannot delete protected ${role}`, async () => {
      responses = [[{ ...target, role }]];
      await assert.rejects(changeUserLifecycle(actor, 12, 'delete'), { status: 403 });
      assert.equal(writes.length, 0);
    });
  }
  await check('DELETE denies anonymous and staff requests', async () => {
    assert.equal((await DELETE(request('DELETE', { id: 12 }, null))).status, 401);
    assert.equal((await DELETE(request('DELETE', { id: 12 }, 'staff'))).status, 403);
  });
  await check('invalid IDs never reach the database', async () => {
    for (const id of [undefined, null, 0, -1, '12abc', 1.5]) {
      await assert.rejects(changeUserLifecycle('owner', id, 'delete'), { status: 400 });
    }
  });
  await check('legacy POST delete uses the same soft-delete path', async () => {
    responses = [[target], []];
    assert.equal((await POST(request('POST', { id: 12, delete: true }))).status, 200);
    assert.ok(writes[0].values.deletedAt);
  });
  await check('session failure rolls back deletion and email release', async () => {
    responses = [[target], []]; failSessionDelete = true;
    await assert.rejects(changeUserLifecycle('owner', 12, 'delete'), /session storage/);
    assert.equal(writes.length, 0);
  });
  await check('appointment cutoff uses Amsterdam summer/winter time', async () => {
    assert.deepEqual(shopDateTime(new Date('2026-07-01T22:15:00Z')), { date: '2026-07-02', time: '00:15' });
    assert.deepEqual(shopDateTime(new Date('2026-12-01T22:15:00Z')), { date: '2026-12-01', time: '23:15' });
  });
  console.log(`${passed} user lifecycle checks passed`);
} finally { await server.close(); }
