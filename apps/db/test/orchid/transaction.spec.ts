/**
 * 事务用法与场景：
 *
 * 1. $transaction：一段完整业务必须“要么全成功，要么全失败”时使用。
 *    例如转账、创建订单并扣库存。回调正常结束即提交；异常逃出回调即全部回滚。
 *
 * 2. 嵌套 $transaction：外层业务还要继续，但某个可选子步骤允许单独失败时使用。
 *    内层会创建 savepoint；捕获内层异常后，内层写入回滚，外层可继续提交。
 *
 * 3. $ensureTransaction：可被单独调用、也可被上层业务组合调用的服务函数使用。
 *    没有事务时自动开启，有事务时直接复用；它不创建 savepoint。
 *    因此它适合要求与外层同生共死的操作，不适合“子步骤失败但只回滚子步骤”。
 *
 * 4. query.recoverable()：预期某条 SQL 可能失败（如唯一约束冲突）但事务仍要继续时使用。
 *    它只为该查询创建 savepoint；普通 try/catch 无法让 PostgreSQL 从查询错误中恢复。
 *
 * 测试策略：每个用例使用独立 ORM 连接，避免 testTransaction 使要测试的事务变成 savepoint。
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createDb } from '@/src';

const testPhones = new Set<string>();
let standaloneDb: ReturnType<typeof createDb>;
let hasStandaloneDb = false;

const phoneFor = (scenario: string) => {
  const phone = `transaction-${scenario}-${crypto.randomUUID()}`;
  testPhones.add(phone);
  return phone;
};

describe('transaction', () => {
  beforeEach(() => {
    testPhones.clear();
    standaloneDb = createDb();
    hasStandaloneDb = true;
  });

  afterEach(async () => {
    if (!hasStandaloneDb) return;

    try {
      for (const phone of testPhones) {
        await standaloneDb.user.where({ phone }).hardDelete();
      }
    } finally {
      testPhones.clear();
      hasStandaloneDb = false;
      await standaloneDb.$close();
    }
  });

  test('$transaction commits a complete unit of work and returns the callback result', async () => {
    const senderPhone = phoneFor('transfer-sender');
    const recipientPhone = phoneFor('transfer-recipient');

    expect(standaloneDb.$isInTransaction()).toBe(false);

    const transfer = await standaloneDb.$transaction(async () => {
      expect(standaloneDb.$isInTransaction()).toBe(true);

      const sender = await standaloneDb.user.create({ phone: senderPhone });
      const recipient = await standaloneDb.user.create({ phone: recipientPhone });

      return { senderId: sender.id, recipientId: recipient.id };
    });

    expect(standaloneDb.$isInTransaction()).toBe(false);
    expect(await standaloneDb.user.find(transfer.senderId)).toMatchObject({ phone: senderPhone });
    expect(await standaloneDb.user.find(transfer.recipientId)).toMatchObject({ phone: recipientPhone });
  });

  test('$transaction rolls back all writes when a business rule fails', async () => {
    const senderPhone = phoneFor('insufficient-balance');

    try {
      await standaloneDb.$transaction(async () => {
        await standaloneDb.user.create({ phone: senderPhone });
        throw new Error('Sender does not have enough balance');
      });
    } catch (error) {
      expect(error).toHaveProperty('message', 'Sender does not have enough balance');
    }

    expect(await standaloneDb.user.where({ phone: senderPhone }).count()).toBe(0);
  });

  test('$transaction rolls back a failed nested transaction to its savepoint', async () => {
    const outerBeforePhone = phoneFor('outer-before');
    const nestedRollbackPhone = phoneFor('nested-rollback');
    const outerAfterPhone = phoneFor('outer-after');

    await standaloneDb.$transaction(async () => {
      await standaloneDb.user.create({ phone: outerBeforePhone });

      try {
        await standaloneDb.$transaction(async () => {
          await standaloneDb.user.create({ phone: nestedRollbackPhone });
          throw new Error('rollback nested transaction');
        });
      } catch (error) {
        expect(error).toHaveProperty('message', 'rollback nested transaction');
      }

      await standaloneDb.user.create({ phone: outerAfterPhone });
    });

    expect(await standaloneDb.user.where({ phone: nestedRollbackPhone }).count()).toBe(0);
    expect(await standaloneDb.user.where({ phone: outerBeforePhone }).count()).toBe(1);
    expect(await standaloneDb.user.where({ phone: outerAfterPhone }).count()).toBe(1);
  });

  test('$ensureTransaction wraps a standalone composed service in one transaction', async () => {
    const depositPhone = phoneFor('deposit');
    const balancePhone = phoneFor('balance-update');

    expect(standaloneDb.$isInTransaction()).toBe(false);

    try {
      await standaloneDb.$ensureTransaction(async () => {
        expect(standaloneDb.$isInTransaction()).toBe(true);
        await standaloneDb.user.create({ phone: depositPhone });

        await standaloneDb.$ensureTransaction(async () => {
          expect(standaloneDb.$isInTransaction()).toBe(true);

          await standaloneDb.user.create({ phone: balancePhone });
          throw new Error('reject deposit');
        });
      });
    } catch (error) {
      expect(error).toHaveProperty('message', 'reject deposit');
    }

    expect(standaloneDb.$isInTransaction()).toBe(false);
    expect(await standaloneDb.user.where({ phone: depositPhone }).count()).toBe(0);
    expect(await standaloneDb.user.where({ phone: balancePhone }).count()).toBe(0);
  });

  test('$ensureTransaction joins a caller transaction without a savepoint', async () => {
    const beforePhone = phoneFor('ensure-before');
    const failedOperationPhone = phoneFor('ensure-failed-operation');
    const afterPhone = phoneFor('ensure-after');

    await standaloneDb.$transaction(async () => {
      expect(standaloneDb.$isInTransaction()).toBe(true);
      await standaloneDb.user.create({ phone: beforePhone });

      try {
        await standaloneDb.$ensureTransaction(async () => {
          expect(standaloneDb.$isInTransaction()).toBe(true);
          await standaloneDb.user.create({ phone: failedOperationPhone });

          // 这是业务判断错误，数据库事务本身仍可由外层决定提交或回滚。
          throw new Error('coupon is unavailable');
        });
      } catch (error) {
        expect(error).toHaveProperty('message', 'coupon is unavailable');
      }

      await standaloneDb.user.create({ phone: afterPhone });
    });

    // ensureTransaction 不创建 savepoint：外层捕获业务错误并提交后，
    // 内层已经写入的数据仍然存在。需要局部回滚时应使用嵌套 $transaction。
    expect(await standaloneDb.user.where({ phone: beforePhone }).count()).toBe(1);
    expect(await standaloneDb.user.where({ phone: failedOperationPhone }).count()).toBe(1);
    expect(await standaloneDb.user.where({ phone: afterPhone }).count()).toBe(1);
  });

  test('a query failure without recoverable aborts the whole transaction', async () => {
    const takenPhone = phoneFor('unrecoverable-taken');
    const nextPhone = phoneFor('unrecoverable-next');

    await standaloneDb.user.create({ phone: takenPhone });

    let duplicateError: unknown;
    let transactionError: unknown;

    try {
      await standaloneDb.$transaction(async () => {
        try {
          await standaloneDb.user.create({ phone: takenPhone });
        } catch (error) {
          duplicateError = error;
        }

        // 即使前面的唯一约束错误已被捕获，PostgreSQL 仍拒绝后续查询。
        await standaloneDb.user.create({ phone: nextPhone });
      });
    } catch (error) {
      transactionError = error;
    }

    expect(duplicateError).toHaveProperty('code', '23505');
    expect(transactionError).toHaveProperty('code', '25P02');
    expect(await standaloneDb.user.where({ phone: takenPhone }).count()).toBe(1);
    expect(await standaloneDb.user.where({ phone: nextPhone }).count()).toBe(0);
  });

  test('query.recoverable() rolls back only an expected failed query', async () => {
    const takenPhone = phoneFor('recoverable-taken');
    const nextPhone = phoneFor('recoverable-next');

    await standaloneDb.user.create({ phone: takenPhone });

    await standaloneDb.$transaction(async () => {
      try {
        // 唯一约束会让 PostgreSQL 中止事务；recoverable 用 savepoint 隔离这次失败。
        await standaloneDb.user.create({ phone: takenPhone }).recoverable();
      } catch (error) {
        expect(error).toHaveProperty('code', '23505');
      }

      await standaloneDb.user.create({ phone: nextPhone });
    });

    expect(await standaloneDb.user.where({ phone: takenPhone }).count()).toBe(1);
    expect(await standaloneDb.user.where({ phone: nextPhone }).count()).toBe(1);
  });
});
