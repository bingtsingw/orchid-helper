import { db } from '@/src';
import { describe, expect, test } from 'bun:test';

describe('query', () => {
  /**
   * 文档: https://orchid-orm.netlify.app/guide/query-methods.html#find
   * 源码: https://github.com/romeerez/orchid-orm/blob/main/packages/pqb/src/query/basic-features/where/where.ts
   *
   * `find`和`findBy`都是`where().take()`的语法糖.
   */
  test('find undefined vs findBy undefined', async () => {
    // `find`会做`undefined`和`null`检查
    expect(async () => db.user.find(undefined!)).toThrow('undefined is not allowed in the find method');
    expect(async () => db.user.find(null!)).toThrow('null is not allowed in the find method');
    expect(async () => db.user.find('')).toThrow('Record is not found');

    // `findOptional`会做`undefined`和`null`检查
    expect(async () => db.user.findOptional(undefined!)).toThrow('undefined is not allowed in the find method');
    expect(async () => db.user.findOptional(null!)).toThrow('null is not allowed in the find method');
    expect(await db.user.findOptional('')).toBeUndefined();

    // `findBy`只检查`undefined`, 不检查`null`, 这个设计是合理的, 因为`find`的对象是`PK`, 不可能是`null`; `findBy`的对象是所有`unique`字段, 可能是`null`.
    expect(async () => db.user.findBy({ id: undefined! })).toThrow('findBy was called with undefined value');
    expect(async () => db.user.findBy({ id: null! })).toThrow('Record is not found');
    expect(async () => db.user.findByOptional({ id: undefined! })).toThrow(
      'findByOptional was called with undefined value',
    );
    expect(await db.user.findByOptional({ id: null! })).toBeUndefined();
  });

  /**
   * `find`和`where`连用相当于`.where().take()`
   */
  test('find with where', async () => {
    const user = await db.user.create({ phone: 'correct' });

    expect(async () => db.user.find(user.id).where({ phone: 'wrong' })).toThrow('Record is not found');
    expect(async () => db.user.where({ phone: 'wrong' }).find(user.id)).toThrow('Record is not found');
    expect(await db.user.find(user.id).where({ phone: 'correct' })).toMatchObject({ id: user.id });
    expect(await db.user.where({ phone: 'correct' }).find(user.id)).toMatchObject({ id: user.id });
    expect(async () => db.user.find(undefined!).where({ phone: 'correct' })).toThrow(
      'undefined is not allowed in the find method',
    );

    expect(async () => db.user.find(user.id).where({ phone: 'wrong' }).get('id')).toThrow('Record is not found');
    expect(async () => db.user.where({ phone: 'wrong' }).find(user.id).get('id')).toThrow('Record is not found');
    expect(await db.user.find(user.id).where({ phone: 'correct' }).get('id')).toEqual(user.id);
    expect(await db.user.where({ phone: 'correct' }).find(user.id).get('id')).toEqual(user.id);
    expect(await db.user.where({ phone: 'correct' }).where({ id: user.id }).select('id').take()).toEqual({
      id: user.id,
    });
    expect(async () => db.user.find(undefined!).where({ phone: 'correct' }).get('id')).toThrow(
      'undefined is not allowed in the find method',
    );

    expect(await db.user.find(user.id).where({ phone: 'wrong' }).getOptional('id')).toBeUndefined();
    expect(await db.user.where({ phone: 'wrong' }).find(user.id).getOptional('id')).toBeUndefined();
    expect(await db.user.where({ phone: 'wrong' }).find(user.id).takeOptional()).toBeUndefined();
    expect(await db.user.where({ phone: 'wrong' }).find(user.id).select('id').takeOptional()).toBeUndefined();
    expect(async () => db.user.find(undefined!).where({ phone: 'correct' }).getOptional('id')).toThrow(
      'undefined is not allowed in the find method',
    );
  });

  /**
   * 在实现上, 是否`optional`影响了`q.returnType`, 这个值是会被`query.xxx`改变的, 所以在query连缀语法中的最后一个会生效,
   * 即`xxxOptional`会覆盖`optional`, 反过来`optional`也会覆盖`xxxOptional`.
   */
  test('findByOptional vs getOptional', async () => {
    const user = await db.user.create({});

    expect(await db.user.find(user.id).get('id')).toEqual(user.id);

    expect(await db.user.find('x').getOptional('id')).toBeUndefined();
    expect(async () => db.user.findOptional('x').get('id')).toThrow('Record is not found');
    expect(await db.user.findOptional('x')).toBeUndefined();

    expect(await db.user.findBy({ id: 'x' }).getOptional('id')).toBeUndefined();
    expect(async () => db.user.findByOptional({ id: 'x' }).get('id')).toThrow('Record is not found');
    expect(await db.user.findByOptional({ id: 'x' })).toBeUndefined();
  });

  test('take vs takeOptional', async () => {
    const user = await db.user.create({ phone: 'correct' });
    await db.user.create({});

    expect(await db.user.count()).toBe(2);

    expect(async () => db.user.where({ phone: 'wrong' }).select('id').take()).toThrow('Record is not found');
    expect(await db.user.where({ phone: 'correct' }).select('id').take()).toMatchObject({ id: user.id });

    expect(await db.user.where({ phone: 'wrong' }).select('id').takeOptional()).toBeUndefined();
    expect(await db.user.where({ phone: 'correct' }).select('id').takeOptional()).toMatchObject({
      id: user.id,
    });

    expect(await db.user.where({ phone: undefined! }).select('id').takeOptional()).toMatchObject({ id: user.id });
  });

  /**
   * 文档: https://orchid-orm.netlify.app/guide/create-update-delete.html#orcreate
   * 源码: https://github.com/romeerez/orchid-orm/blob/main/packages/pqb/src/query/basic-features/mutate/or-create.ts
   *
   * `orCreate`是在`query`之后执行的, 通过返回的`row`的`count`来判断之否执行:
   *  a. 如果`count`为0, 则执行`create`
   *  b. 如果`count`为1, 不进行任何操作
   *  b. 如果`count`大于1, 报错
   */
  test('orCreate', async () => {
    // 测试返回值, `get`需要在`orCreate`之后, `select`需要在`orCreate`之前.
    const r1 = await db.user.where({ password: '1' }).take().orCreate({ password: '1' }).get('id');
    const r2 = await db.user.where({ password: '1' }).take().select('id').orCreate({ password: '1' });
    const r3 = await db.user.find(r1).select('id').orCreate({ password: '1' });
    const r4 = await db.user.find(r1).orCreate({ password: '1' }).get('id');
    const r5 = await db.user.find(r1).orCreate({ password: '1' }).select('id');
    expect(await db.user.count()).toBe(1);
    expect(r1).toEqual(r2.id);
    expect(r1).toEqual(r3.id);
    expect(r1).toEqual(r4);
    // @ts-expect-error
    expect(r5.id).toEqual(r1); // 注意r5的返回值类型为void, 但是实际是有返回的, 因为returnType的判断是在`orCreate`函数中检查`select`

    /**
     * 1. `take/find/findBy`在`orCreate`语句中不生效, `orCreate`前面的查询只有`where`, 但是虽然运行时不生效, 编译时却靠他来做类型检查.
     * 2. `where`的结果若`count > 1`, 会抛出运行时错误.
     */

    // @ts-expect-error
    await db.user.where({ password: '2' }).orCreate({ password: '2' });
    expect(await db.user.count()).toBe(2);

    // @ts-expect-error
    expect(async () => db.user.where({}).orCreate({ password: '3' })).toThrow(
      'Only one row was expected to find, found 2 rows.',
    );
    expect(async () => db.user.where({}).take().orCreate({ password: '3' })).toThrow(
      'Only one row was expected to find, found 2 rows.',
    );
    expect(async () => db.user.findBy({ phone: null }).take().orCreate({ password: '3' })).toThrow(
      'Only one row was expected to find, found 2 rows.',
    );

    const sql = 'SELECT "user"."id" FROM "user" WHERE ("user"."id" = $1) AND ("user"."deleted_at" IS NULL)';
    expect(db.user.where({ id: '' }).take().orCreate({ password: '' }).select('id').toSQL()).toMatchObject({
      text: sql,
    });
    expect(db.user.where({ id: '' }).take().select('id').orCreate({ password: '' }).toSQL()).toMatchObject({
      text: sql,
    });
    expect(db.user.find('').orCreate({ password: '' }).select('id').toSQL()).toMatchObject({
      text: sql,
    });
    expect(db.user.find('').select('id').orCreate({ password: '' }).toSQL()).toMatchObject({
      text: sql,
    });
    // @ts-expect-error
    expect(db.user.where({ id: '' }).orCreate({ password: '' }).select('id').toSQL()).toMatchObject({
      text: sql,
    });
    // @ts-expect-error
    expect(db.user.where({ id: '' }).select('id').orCreate({ password: '' }).toSQL()).toMatchObject({
      text: sql,
    });
  });

  /**
   * `LIMIT`和`UPDATE`无法一起使用, 所以`.take().update()`中的`take()`不生效.
   */
  test('update with take', async () => {
    await db.user.create({ password: '123' });
    await db.user.create({ password: '123' });
    await db.user.create({ password: '456' });
    await db.user.create({ password: '456' });

    await db.user.where({ password: '123' }).update({ password: 'case1' });
    expect(await db.user.where({ password: 'case1' }).count()).toBe(2);

    // !warning `.take()`对`update`无效
    await db.user.where({ password: '456' }).take().update({ password: 'case2' });
    expect(await db.user.where({ password: 'case2' }).count()).toBe(2);
  });

  test('upsert', async () => {
    // create
    await db.user
      .where({ phone: '123' })
      .take()
      .upsert({
        update: { phone: '456' },
        create: { phone: '123' },
      });
    expect(await db.user.where({ phone: '123' }).get('phone')).toBe('123');

    // update
    await db.user
      .where({ phone: '123' })
      .take()
      .upsert({
        update: { phone: '456' },
        create: { phone: '123' },
      });
    expect(await db.user.where({ phone: '456' }).get('phone')).toBe('456');
    expect(async () => db.user.where({ phone: '123' }).get('phone')).toThrow('Record is not found');

    expect(await db.user.count()).toBe(1);
  });

  /**
   * `upsert`中使用到了`update`的逻辑, 所以`take`不生效.
   */
  test('upsert with take', async () => {
    await db.user.create({ password: '1' });
    await db.user.create({ password: '1' });

    expect(
      async () =>
        await db.user
          .where({ password: '1' })
          .take()
          .upsert({
            create: { password: '2' },
            update: { password: '1' },
          }),
    ).toThrow('Only one row was expected to find, found 2 rows.');
  });

  test('jsonSet & jsonInsert', async () => {
    const user = await db.user.create({});
    const queryUser = db.user.find(user.id);

    await queryUser.update({
      profile: (q) => q.get('profile').jsonSet('bio', ['test']),
    });
    expect(await queryUser.get('profile')).toEqual({ bio: ['test'] as any });

    await queryUser.update({
      profile: (q) => q.get('profile').jsonInsert(['bio', 0], 'one'),
    });
    expect(await queryUser.get('profile')).toEqual({ bio: ['one', 'test'] as any });

    // 注意这个`jsonInsert`没有生效
    await queryUser.update({
      profile: (q) => q.get('profile').jsonInsert(['bio2', 0], 'two'),
    });
    expect(await queryUser.get('profile')).toEqual({ bio: ['one', 'test'] as any });

    await queryUser.update({
      profile: (q) => q.get('profile').jsonInsert(['bio2'], 'one'),
    });
    expect(await queryUser.get('profile')).toMatchObject({ bio2: 'one' });

    // 注意这个`jsonInsert`没有生效
    await queryUser.update({
      profile: (q) => q.get('profile').jsonInsert(['bio2', 0], 'two'),
    });
    expect(await queryUser.get('profile')).toMatchObject({ bio2: 'one' });

    // 只有当要插入的key的值是数组时, 才能使用`jsonInsert(['key', index])`的形式
    await queryUser.update({
      profile: (q) => q.get('profile').jsonInsert(['bio3'], []),
    });
    expect(await queryUser.get('profile')).toMatchObject({ bio3: [] });

    await queryUser.update({
      profile: (q) => q.get('profile').jsonInsert(['bio3', 0], 'three'),
    });
    expect(await queryUser.get('profile')).toMatchObject({ bio3: ['three'] });
  });

  /**
   * `LIMIT`和`DELETE`无法一起使用, 所以`.take().delete()`中的`take()`不生效.
   */
  test('delete', async () => {
    await db.user.create({ password: '1' });
    await db.user.create({ password: '1' });
    await db.user.where({ password: '1' }).delete();
    expect(await db.user.count()).toBe(0);

    // !warning `.take()`对`delete`无效
    await db.user.create({ password: '1' });
    await db.user.create({ password: '1' });
    await db.user.where({ password: '1' }).take().delete();
    expect(await db.user.count()).toBe(0);
  });
});
