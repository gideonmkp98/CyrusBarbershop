import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateDynamicSlots, timeToMinutes } from './availability-slots';

const minutes = timeToMinutes;
const times = (slots: ReturnType<typeof generateDynamicSlots>) => slots.filter(s => s.available).map(s => s.time);

test('45-minute treatments can start at 10:30 without changing their duration', () => {
  assert.deepEqual(times(generateDynamicSlots(600, 720, [], [], 45, false, 0)),
    ['10:00', '10:15', '10:30', '10:45', '11:00', '11:15']);
});

test('10:30 booking occupies the entire 45 minutes, with adjacent bookings allowed', () => {
  const slots = times(generateDynamicSlots(540, 780, [{ timeSlot: '10:30', duration: 45 }], [], 45, false, 0));
  assert.ok(slots.includes('09:45'));
  assert.ok(slots.includes('11:15'));
  for (const time of ['10:00', '10:15', '10:30', '10:45', '11:00']) assert.ok(!slots.includes(time), time);
});

test('a later booking only removes starts whose full duration overlaps', () => {
  const slots = times(generateDynamicSlots(600, 780, [{ timeSlot: '11:15', duration: 30 }], [], 45, false, 0));
  assert.ok(slots.includes('10:30'));
  assert.ok(!slots.includes('10:45'));
  assert.ok(slots.includes('11:45'));
});

test('requested add-ons extend the required free window', () => {
  const booked = [{ timeSlot: '11:15', duration: 30 }];
  assert.ok(times(generateDynamicSlots(600, 780, booked, [], 45, false, 0)).includes('10:30'));
  assert.ok(!times(generateDynamicSlots(600, 780, booked, [], 55, false, 0)).includes('10:30'));
});

test('existing add-ons and non-quarter-hour end times leave immediate starts available', () => {
  const slots = times(generateDynamicSlots(600, 840, [{ timeSlot: '10:30:00', duration: 55 }], [], 45, false, 0));
  assert.ok(!slots.includes('11:15'));
  assert.ok(slots.includes('11:25'));
  assert.ok(slots.includes('11:30'));
  assert.equal(new Set(slots).size, slots.length);
  assert.deepEqual(slots, [...slots].sort());
});

test('unsorted, overlapping appointments do not expose occupied times', () => {
  const slots = times(generateDynamicSlots(600, 840, [
    { timeSlot: '11:00', duration: 60 },
    { timeSlot: '10:30', duration: 45 },
    { timeSlot: '10:45', duration: 15 }
  ], [], 45, false, 0));
  assert.equal(slots[0], '12:00');
});

test('opening and closing boundaries use the full duration', () => {
  assert.deepEqual(times(generateDynamicSlots(630, 720, [], [], 45, false, 0)), ['10:30', '10:45', '11:00', '11:15']);
  assert.deepEqual(generateDynamicSlots(600, 630, [], [], 45, false, 0), []);
  assert.deepEqual(generateDynamicSlots(720, 600, [], [], 45, false, 0), []);
});

test('blocked start times also match SQL TIME strings with seconds', () => {
  const slots = times(generateDynamicSlots(600, 720, [], ['10:30:00', '10:45'], 45, false, 0));
  assert.ok(!slots.includes('10:30'));
  assert.ok(!slots.includes('10:45'));
  assert.ok(slots.includes('10:15'));
});

test('past starts and the current minute are unavailable only for today', () => {
  assert.deepEqual(times(generateDynamicSlots(600, 720, [], [], 45, true, 630)), ['10:45', '11:00', '11:15']);
  assert.ok(times(generateDynamicSlots(600, 720, [], [], 45, false, 630)).includes('10:30'));
});

test('invalid durations cannot cause an endless generation loop', () => {
  for (const duration of [0, -15, NaN, Infinity]) {
    assert.deepEqual(generateDynamicSlots(600, 720, [], [], duration, false, 0), []);
  }
});

test('all emitted starts satisfy an independent minute-by-minute occupancy check', () => {
  const booked = [{ timeSlot: '09:40', duration: 55 }, { timeSlot: '12:10', duration: 80 }, { timeSlot: '16:45', duration: 60 }];
  const occupied = new Set<number>();
  for (const booking of booked) {
    for (let minute = minutes(booking.timeSlot); minute < minutes(booking.timeSlot) + booking.duration; minute++) occupied.add(minute);
  }
  for (const duration of [10, 30, 45, 55, 60, 90]) {
    const slots = times(generateDynamicSlots(600, 1080, booked, ['14:30'], duration, false, 0));
    for (const time of slots) {
      const start = minutes(time);
      assert.ok(start >= 600 && start + duration <= 1080);
      assert.notEqual(time, '14:30');
      for (let minute = start; minute < start + duration; minute++) assert.ok(!occupied.has(minute), `${time}, duration ${duration}`);
    }
    for (let start = 600; start + duration <= 1080; start += 15) {
      const fits = Array.from({ length: duration }, (_, i) => start + i).every(minute => !occupied.has(minute));
      if (fits && start !== 870) assert.ok(slots.some(time => minutes(time) === start), `Missing ${start}, duration ${duration}`);
    }
  }
});
