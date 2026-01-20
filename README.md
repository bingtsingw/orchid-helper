# @bingtsingw/orchid-helper

## How to use

```ts
import { BaseTable } from '@bingtsingw/orchid-helper';

export class TableUser extends BaseTable {
  public override readonly table = 'user';

  public override columns = this.setColumns((t) => ({
    ...t.baseColumns(),

    name: t.string().nullable(),
    // ...
  }));
}
```

## How to test

```shell
# 1. build
pnpm run check-publish
# 2. go to apps/db folder
cd apps/db
# 3. run db test
pnpm run db:test-rebuild
pnpm run db:test
```
