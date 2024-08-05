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
