import { db } from '@/src';
import { describe, expect, test } from 'bun:test';
import { parseISO } from 'date-fns';
import { expectCloseToDate, expectNotCloseToDate } from '../_util';

describe('BaseTable', () => {
  test('createdAt', async () => {
    const now = new Date();
    const user = await db.user.create({});
    const query = db.user.find(user.id);

    expectCloseToDate(await query.get('createdAt'), now);

    const t1 = parseISO('2000-01-01');
    await query.update({ createdAt: t1 });
    expectNotCloseToDate(await query.get('createdAt'), now);
    expectCloseToDate(await query.get('createdAt'), t1);
  });

  test('updatedAt', async () => {
    const now = new Date();
    const user = await db.user.create({});
    const query = db.user.find(user.id);

    expectCloseToDate(await query.get('updatedAt'), now);

    const t1 = parseISO('2000-01-01');
    await query.update({ updatedAt: t1.toISOString() });
    expectNotCloseToDate(await query.get('updatedAt'), now);
    expectCloseToDate(await query.get('updatedAt'), t1);

    await query.update({});
    expectNotCloseToDate(await query.get('updatedAt'), t1);
    expectCloseToDate(await query.get('updatedAt'), now);

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

  test('xTimestamp', async () => {
    const now = new Date();
    const user = await db.user.create({});
    const post = await db.post.create({ userId: user.id, publishAt: new Date() });

    expectCloseToDate(await db.post.find(post.id).get('publishAt'), now);

    await db.post.find(post.id).update({ publishAt: now.toISOString() });
    expectCloseToDate(await db.post.find(post.id).get('publishAt'), now);
  });
});
