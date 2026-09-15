# @bingtsingw/orchid-helper

`@bingtsingw/orchid-helper` 是对 [Orchid ORM](https://orchid-orm.netlify.app/) 表定义的薄封装。

它统一项目中的命名、ID、时间和常用列类型约定；`apps/db` 则是独立的 PostgreSQL 回归测试夹具，用于在有意升级 ORM 时验证这些约定。它不是业务应用。

## 版本契约

2.0 起，本包将 `orchid-orm` peer 从宽松范围收紧为精确版本，避免包管理器在未执行本项目回归测试的情况下自动选择后续 Orchid 版本。

| helper 版本     | Orchid 回归测试基线 | 发布时的 Orchid peer 声明 |
| --------------- | ------------------- | ------------------------- |
| `2.0.0`         | `1.62.4`            | `1.62.4`                  |
| `1.0.2`-`1.0.3` | `1.62.4`            | `^1.62.4`                 |
| `1.0.1`         | `1.62.1`            | `^1.62.1`                 |
| `1.0.0`         | `1.62.0`            | `^1.62.0`                 |
| `0.5.0`         | `1.35.0`            | `^1.34.5`                 |
| `0.2.0`–`0.4.0` | `1.34.5`            | `^1.34.5`                 |

## 使用

```sh
pnpm add @bingtsingw/orchid-helper@<版本> orchid-orm@<匹配版本> pg@<项目锁定版本>
```

```ts
import { BaseTable } from '@bingtsingw/orchid-helper';

export class TableUser extends BaseTable {
  public override readonly table = 'user';
  public readonly softDelete = true;

  public override columns = this.setColumns((t) => ({
    ...t.baseColumns(),
    name: t.string().nullable(),
  }));
}
```

`BaseTable` 默认启用 snake_case，并提供：

- `baseColumns()`：`id`、`createdAt`、`updatedAt`、`deletedAt`；默认 ID 策略是 `uuid25`，也可指定 `cuid2` 或 `shortid`。
- `createdAt`、`updatedAt`、`deletedAt`、`cuid`：可单独使用的 `field helper`。
- `xTimestamp()`：无时区 timestamp，读取为 `Date`。
- `xJsonText()`：将对象或数组 JSON 序列化为文本列。
- `xEnum()`：TypeScript 类型收窄，不会创建 PostgreSQL enum 或 check constraint。

`baseColumns()` 包含 `deletedAt` 并不等于启用软删除；需要像示例一样在表中声明 `softDelete = true`。

## 本地开发与构建

环境要求：Node.js 24、Bun 1.4、pnpm 12.4.1。

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run check
```

## PostgreSQL 回归测试

测试入口位于 `apps/db`，使用真实 PostgreSQL 和 Bun。

1. 首次运行或测试 schema 变更后，重建专用测试库：

   ```sh
   cd apps/db
   pnpm run db:test-rebuild
   ```

   该命令使用 `prisma db push --force-reset --accept-data-loss`，会清空 `DATABASE_URL` 指向的数据库。

2. 运行回归测试：

   ```sh
   pnpm run db:test
   ```

`db:test` 不会重建数据库；测试用例通过 Orchid 的测试事务回滚隔离。需要查看 SQL 时，将 `DATABASE_LOG=true` 写入 `apps/db/.env.test`。

CI 会先重建专用数据库，再执行同一组 `db:test` 用例。

## 上游破坏性更新总结

### orchid-orm 1.56

从`1.56`起, `findBy`开始检查`undefined`值.

### orchid-orm 1.42

在`1.42`版本之前, `orCreate`会自动给之前的`query`加上`LIMIT 1`, 所以写`where()`等同于写`where().take()`.  
在`1.42`版本之后, `orCreate`会自动去掉之前`query`的`LIMIT 1`, 所以写`where().take()`等同于写`where()`.

### orchid-orm 1.36

Stop handling `null` in column `parse`, add `parseNull` for this instead.
