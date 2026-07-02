import { BaseTable } from '@bingtsingw/orchid-helper';
import { cuid2 } from '@xstools/utility/cuid2';

export class TableUuid25 extends BaseTable {
  public override readonly table = 'uuid25';

  public override columns = this.setColumns((t) => ({
    ...t.baseColumns({ strategy: 'uuid25' }),
  }));
}

export class TableCuid2 extends BaseTable {
  public override readonly table = 'cuid2';

  public override columns = this.setColumns((t) => ({
    ...t.baseColumns({ strategy: 'cuid2' }),

    l20: t.string().default(() => cuid2(20)),
  }));
}

export class TableShortId extends BaseTable {
  public override readonly table = 'short_id';

  public override columns = this.setColumns((t) => ({
    ...t.baseColumns({ strategy: 'shortid' }),
  }));
}
