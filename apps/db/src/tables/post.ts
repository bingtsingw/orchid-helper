import { BaseTable } from '@bingtsingw/orchid-helper';
import { EnumPostState } from '../enums';
import { TableUser } from './user';

export class TablePost extends BaseTable {
  public override readonly table = 'post';
  public readonly softDelete = true;

  public override columns = this.setColumns((t) => ({
    ...t.baseColumns(),
    publishAt: t.xTimestamp().nullable(),

    state: t.xEnum(EnumPostState).nullable(),
    title: t.string().nullable(),
    cover: t.string().nullable(),
    content: t.xJsonText().nullable(),
    location: t.json().hasDefault(),

    p1: t
      .string()
      .parse((v) => v ?? 'default p1')
      .nullable(),
    p2: t
      .string()
      .parseNull((v) => v ?? 'default p2')
      .parse(() => 'try to cover parseNull')
      .nullable(),
    p3: t
      .json<object>()
      .parse((v) => ({
        ...v,
        x: 'x',
      }))
      .hasDefault(),

    userId: t.string(),
  }));

  public relations = {
    user: this.belongsTo(() => TableUser, {
      required: true,
      columns: ['userId'],
      references: ['id'],
    }),
  };
}
