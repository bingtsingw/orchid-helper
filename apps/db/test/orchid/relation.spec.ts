import { db, EnumPostState } from '@/src';
import { describe, expect, test } from 'bun:test';

describe('query', () => {
  test('whereExists', async () => {
    const u1 = await db.user.create({ password: '1' });
    const u2 = await db.user.create({ password: '2' });
    await db.post.create({ userId: u2.id, state: EnumPostState.Publish });

    expect(await db.user.whereNotExists('posts').count()).toBe(1);
    expect(await db.user.whereNotExists('posts').get('id')).toBe(u1.id);

    expect(await db.user.whereExists('posts').count()).toBe(1);
    expect(await db.user.whereExists('posts').get('id')).toBe(u2.id);

    expect(await db.user.where({ password: '2' }).whereExists('posts').count()).toBe(1);
    expect(await db.user.where({ password: '2' }).whereExists('posts').get('id')).toBe(u2.id);

    expect(await db.user.where({ password: '1' }).whereExists('posts').count()).toBe(0);
    expect(await db.user.where({ password: '1' }).whereExists('posts').getOptional('id')).toBeUndefined();

    expect(await db.user.whereExists('posts', (q) => q.where({ state: EnumPostState.Publish })).count()).toBe(1);
    expect(await db.user.whereExists('posts', (q) => q.where({ state: EnumPostState.Finish })).count()).toBe(0);
  });
});
