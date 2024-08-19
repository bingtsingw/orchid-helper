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

1. Go to `apps/db` folder
2. Run `npm run db:test-rebuild` to setup test database
3. Run `npm run db:test` to run database test
