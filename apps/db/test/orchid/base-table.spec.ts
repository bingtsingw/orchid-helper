import { db, EnumPostState } from '@/src';
import { describe, expect, test } from 'bun:test';
import { parseISO } from 'date-fns';
import { expectCloseToDate, expectNotCloseToDate } from '../_util';

describe('BaseTable', () => {
  test('createdAt', async () => {
    const now = new Date();
    const t1 = parseISO('2000-01-01');
    const user = await db.user.create({});
    const query = db.user.find(user.id);

    expectCloseToDate(await query.get('createdAt'), now);

    await query.update({ createdAt: t1 });
    expectNotCloseToDate(await query.get('createdAt'), now);
    expectCloseToDate(await query.get('createdAt'), t1);
  });

  test('updatedAt', async () => {
    const now = new Date();
    const t1 = parseISO('2000-01-01');
    const user = await db.user.create({});
    const query = db.user.find(user.id);

    expectCloseToDate(await query.get('updatedAt'), now);

    await query.update({ updatedAt: t1.toISOString() });
    expectNotCloseToDate(await query.get('updatedAt'), now);
    expectCloseToDate(await query.get('updatedAt'), t1);

    await query.update({});
    expectNotCloseToDate(await query.get('updatedAt'), t1);
    expectCloseToDate(await query.get('updatedAt'), now);

    await query.update({ updatedAt: t1.toISOString() });
    expectNotCloseToDate(await query.get('updatedAt'), now);
    expectCloseToDate(await query.get('updatedAt'), t1);

    await query.update({ phone: 'xxx' });
    expectNotCloseToDate(await query.get('updatedAt'), t1);
    expectCloseToDate(await query.get('updatedAt'), now);
  });

  test('deletedAt', async () => {
    const now = new Date();
    const user = await db.user.create({});
    const query = db.user.find(user.id);

    expect(await query.get('deletedAt')).toBeNull();

    await query.delete();
    expect(async () => query).toThrow('Record is not found');
    expect(await query.includeDeleted()).toMatchObject({ id: user.id });
    expectCloseToDate((await query.includeDeleted().get('deletedAt')) as Date, now);

    const t1 = parseISO('2000-01-01');
    await query.includeDeleted().update({ deletedAt: t1.toISOString() });
    expectNotCloseToDate(await query.includeDeleted().get('deletedAt'), now);
    expectCloseToDate(await query.includeDeleted().get('deletedAt'), t1);

    await query.includeDeleted().update({ deletedAt: null });
    expect(async () => query).not.toThrow('Record is not found');
    expect(await query).toMatchObject({ id: user.id });

    await query.includeDeleted().update({ deletedAt: t1.toISOString() });
    expectNotCloseToDate(await query.includeDeleted().get('deletedAt'), now);
    expectCloseToDate(await query.includeDeleted().get('deletedAt'), t1);
  });

  test('xEnum', async () => {
    const user = await db.user.create({});
    await db.post.create({ userId: user.id, state: EnumPostState.Publish });

    expect(await db.post.where({ state: EnumPostState.Publish }).count()).toBe(1);
    // @ts-expect-error
    expect(await db.post.where({ state: 'Publish' }).count()).toBe(1);

    // @ts-expect-error
    await db.post.where({ state: EnumPostState.Publish }).update({ state: 'Finish' });

    expect(await db.post.where({ state: EnumPostState.Publish }).count()).toBe(0);
    // @ts-expect-error
    expect(await db.post.where({ state: 'Publish' }).count()).toBe(0);

    expect(await db.post.where({ state: EnumPostState.Finish }).count()).toBe(1);
    // @ts-expect-error
    expect(await db.post.where({ state: 'Finish' }).count()).toBe(1);
  });

  test('xJsonText', async () => {
    const user = await db.user.create({});
    const post = await db.post.create({ userId: user.id, content: [{ a: 1 }, { b: 2 }] });
    const query = db.post.find(post.id);

    expect(await query.get('content')).toBe('[{"a":1},{"b":2}]');

    await query.update({ content: null });
    expect(await query.get('content')).toBe(null);

    await query.update({ content: {} });
    expect(await query.get('content')).toBe('{}');

    // @ts-expect-error
    expect(async () => query.update({ content: '[]' })).toThrow('Invalid value for JSON column');
  });

  test('xTimestamp', async () => {
    const now = new Date();
    const t1 = parseISO('2000-01-01');
    const user = await db.user.create({});
    const post = await db.post.create({ userId: user.id, publishAt: now });
    const query = db.post.find(post.id);

    expectCloseToDate(await query.get('publishAt'), now);

    await query.update({ publishAt: t1.toISOString() });
    expectCloseToDate(await query.get('publishAt'), t1);
  });
});
