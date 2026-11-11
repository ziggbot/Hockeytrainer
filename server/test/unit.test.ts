import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hashPassword, verifyPassword } from '../auth.js';
import { aggregateEquipment } from '../equipment.js';
import { ageSpan, suggestPractice, type CandidateDrill } from '../planner.js';

describe('aggregateEquipment', () => {
  test('sequential drills reuse gear (max), station drills add up (sum)', () => {
    const result = aggregateEquipment([
      { station: null, equipment: [{ item: 'Puckar', qty: 20 }, { item: 'Koner', qty: 6 }] },
      { station: null, equipment: [{ item: 'puckar', qty: 30 }] },
      { station: 1, equipment: [{ item: 'Koner', qty: 5 }] },
      { station: 2, equipment: [{ item: 'Koner', qty: 4 }, { item: 'Små mål', qty: 2 }] },
    ]);
    assert.deepEqual(result, [
      { item: 'Koner', qty: 9 },
      { item: 'Puckar', qty: 30 },
      { item: 'Små mål', qty: 2 },
    ]);
  });
});

describe('suggestPractice', () => {
  const d = (id: string, tags: string[], duration: number): CandidateDrill => ({
    id, title: id, skill_tags: tags, duration_min: duration, age_min: null, age_max: null,
  });
  const drills = [
    d('warm', ['uppvärmning', 'skridsko'], 5),
    d('skate', ['skridsko'], 8),
    d('pass', ['passning'], 6),
    d('shoot', ['skott'], 10),
    d('game', ['smålagsspel'], 12),
  ];

  test('starts with warm-up, ends with game, fills the time exactly', () => {
    const items = suggestPractice(drills, ['skridsko', 'passning'], 45);
    assert.equal(items[0]!.drillId, 'warm');
    assert.equal(items.at(-1)!.drillId, 'game');
    assert.equal(items.reduce((s, i) => s + i.minutes, 0), 45);
    assert.ok(!items.some((i) => i.drillId === 'shoot'), 'off-focus drill not picked');
  });

  test('never exceeds a short slot', () => {
    const items = suggestPractice(drills, [], 20);
    assert.ok(items.reduce((s, i) => s + i.minutes, 0) <= 20);
  });
});

test('ageSpan converts birth years to ages', () => {
  assert.deepEqual(ageSpan(2026, 2016, 2017), [9, 10]);
  assert.equal(ageSpan(2026, null, null), null);
});

test('password hashing round-trips and rejects wrong passwords', async () => {
  const h = await hashPassword('hemligt123');
  assert.equal(await verifyPassword('hemligt123', h), true);
  assert.equal(await verifyPassword('hemligt124', h), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
});
