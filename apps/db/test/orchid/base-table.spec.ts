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
    expect(async () => query).toThrow('Record is not found');
    expectNotCloseToDate(await query.includeDeleted().get('deletedAt'), now);
    expectCloseToDate(await query.includeDeleted().get('deletedAt'), t1);
  });

  test('json', async () => {
    const user = await db.user.create({ profile: { name: 'test' } });
    const query = db.user.find(user.id);

    await query.update({ profile: { name: 'test2' } });
    expect(await query.get('profile')).toEqual({ name: 'test2' });
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

  test('parse', async () => {
    const user = await db.user.create({});
    const post = await db.post.create({ userId: user.id });
    const query = db.post.find(post.id);

    /**
     * 在1.36.0版本之前, parse会处理null, 这个测试可以pass.
     * 在1.36.0版本之后, parse不会处理null, 所以`.parse((v) => v ?? 'xxx')`这个写法没有意义
     */
    // expect(post.p1).toBe('default p1');
    expect(post.p1).toBe(null);

    expect(post.p2).toBe('default p2');

    // parse仍然会解析`{}`
    expect(post.p3).toEqual({ x: 'x' });

    await query.update({ p2: 'p2' });
    expect(await query.get('p2')).toBe('try to cover parseNull');
  });
});
