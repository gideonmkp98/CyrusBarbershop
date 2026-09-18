import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createServer } from 'vite';

// Run the real route and booking validator with isolated database responses.
// Never connect to a database or create appointments/send emails in these tests.
let responses: unknown[][] = [];
const database = {
  select() {
    assert.ok(responses.length, 'Unexpected database query');
    const result = responses.shift()!;
    const query = {
      from() { return query; },
      where() { return query; },
      limit() { return query; },
      then(onResult: (rows: unknown[]) => unknown) { return Promise.resolve(result).then(onResult); }
    };
    return query;
  }
};
(globalThis as any).__schedulingTestDb = database;
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { $lib: resolve('src/lib') } },
  plugins: [{
    name: 'isolated-scheduling-database',
    enforce: 'pre',
    resolveId(id) {
      const normalized = id.replaceAll('\\', '/');
      if (/\/lib\/server\/db(?:\/index)?$/.test(normalized)) return '\0test-database';
    },
    load(id) {
      if (id === '\0test-database') return 'export const db = globalThis.__schedulingTestDb;';
    }
  }]
});

let passed = 0;
try {
  const { GET } = await server.ssrLoadModule('/src/routes/api/availability/+server.ts');
  const { validateAppointmentConfiguration } = await server.ssrLoadModule('/src/lib/server/scheduling.ts');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const hours = [{ openTime: '10:00', closeTime: '13:00' }];
  const service = { id: 1, name: 'Knippen', duration: 45, price: '35.00', category: 'hair', isActive: true };
  const booked = [{ id: 10, serviceId: 1, timeSlot: '11:15' }];

  async function check(name: string, run: () => Promise<void>) {
    await run();
    assert.equal(responses.length, 0, 'All expected database reads should run');
    passed++;
    console.log(`PASS ${name}`);
  }
  async function availability(params: string) {
    const response = await GET({ url: new URL(`http://localhost/api/availability?date=${date}&serviceId=1&${params}`), locals: {} });
    assert.equal(response.status, 200);
    const body = await response.json();
    return body.slots.filter((slot: any) => slot.available).map((slot: any) => slot.time);
  }

  await check('API single barber allows 10:30 before an 11:15 booking', async () => {
    responses = [[service], hours, [], [], hours, booked, [{ duration: 45 }], []];
    const times = await availability('staffId=1');
    assert.ok(times.includes('10:30'));
    assert.ok(!times.includes('10:45'));
    assert.ok(times.includes('12:00'));
  });
  await check('API requested and existing extras extend occupied time', async () => {
    responses = [[service], hours, [], [], hours, booked, [{ duration: 45 }], [{ duration: 10 }]];
    const times = await availability('staffId=1&duration=55');
    assert.ok(!times.includes('10:30'));
    assert.ok(!times.includes('12:00'));
    assert.equal(times.at(-1), '10:15');
  });
  await check('API no preference uses a free second barber', async () => {
    responses = [[service], hours, [], [{ id: 1 }, { id: 2 }],
      [], hours, booked, [{ duration: 45 }], [],
      [], hours, []];
    const times = await availability('allBarbers=true');
    assert.ok(times.includes('10:30'));
    assert.ok(times.includes('11:15'));
    assert.equal(new Set(times).size, times.length);
  });
  await check('API respects staff time off', async () => {
    responses = [[service], hours, [], [{ id: 99 }]];
    assert.deepEqual(await availability('staffId=1'), []);
  });
  await check('API respects narrower staff hours and blocked starts', async () => {
    responses = [[service], hours, [{ timeSlot: '10:45:00' }], [], [{ openTime: '10:30', closeTime: '11:30' }], []];
    assert.deepEqual(await availability('staffId=1'), ['10:30']);
  });
  const input = { serviceId: 1, staffId: 1, date, timeSlot: '10:30' };
  const staff = [{ id: 1, displayName: 'Barber' }];
  await check('save validation accepts 10:30 with a full 45-minute duration', async () => {
    responses = [[service], hours, [], staff, [], hours, booked, [{ duration: 45 }], []];
    const result = await validateAppointmentConfiguration(database, input);
    assert.equal(result.totalDuration, 45);
    assert.equal(result.resolvedStaffId, 1);
  });
  await check('save validation rejects overlap at 10:45', async () => {
    responses = [[service], hours, [], staff, [], hours, booked, [{ duration: 45 }], []];
    await assert.rejects(validateAppointmentConfiguration(database, { ...input, timeSlot: '10:45' }), { code: 'OVERLAP' });
  });
  await check('save validation includes requested extras in overlap detection', async () => {
    responses = [[service], [{ ...service, id: 2, duration: 10, category: 'extra' }], hours, [], staff, [], hours, booked, [{ duration: 45 }], []];
    await assert.rejects(validateAppointmentConfiguration(database, { ...input, addOnIds: [2] }), { code: 'OVERLAP' });
  });
  await check('save validation includes existing extras in overlap detection', async () => {
    responses = [[service], hours, [], staff, [], hours, [{ id: 10, serviceId: 1, timeSlot: '10:00' }], [{ duration: 30 }], [{ duration: 10 }]];
    await assert.rejects(validateAppointmentConfiguration(database, input), { code: 'OVERLAP' });
  });
  await check('save validation rejects treatments ending after closing', async () => {
    responses = [[service], hours];
    await assert.rejects(validateAppointmentConfiguration(database, { ...input, timeSlot: '12:30' }), { code: 'OUTSIDE_OPENING_HOURS' });
  });
  console.log(`${passed} integration checks passed.`);
} finally {
  await server.close();
  delete (globalThis as any).__schedulingTestDb;
}
