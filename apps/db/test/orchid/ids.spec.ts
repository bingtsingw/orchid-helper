import { db } from '@/src';
import { describe, expect, test } from 'bun:test';

describe('ids', () => {
  test('uuid25', async () => {
    const u1 = await db.uuid25.create({});
    const u2 = await db.uuid25.create({});

    expect(u1.id.length).toBe(25);
    expect(u2.id > u1.id).toBeTrue();
  });

  test('cuid2', async () => {
    const c1 = await db.cuid2.create({});

    expect(c1.id.length).toBe(24);
  });

  test('short', async () => {
    const s1 = await db.shortId.create({});

    expect(s1.id.length).toBe(6);
  });
});
