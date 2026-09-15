import { describe, expect, test } from 'bun:test';
import { db } from '@/src';

describe('query', () => {
  test('order, offset, and limit', async () => {
    await db.user.create({ phone: 'page-3' });
    await db.user.create({ phone: 'page-1' });
    await db.user.create({ phone: 'page-2' });

    const page = await db.user.order({ phone: 'ASC' }).offset(1).limit(2).pluck('phone');

    expect(page).toEqual(['page-2', 'page-3']);
  });
});
