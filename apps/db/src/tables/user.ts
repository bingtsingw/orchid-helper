import { BaseTable } from '@bingtsingw/orchid-helper';
import { TablePost } from './post';

export class TableUser extends BaseTable {
  public override readonly table = 'user';
  public readonly softDelete = true;

  public override columns = this.setColumns((t) => ({
    ...t.baseColumns(),

    phone: t.string().unique().nullable(),
    email: t.string().unique().nullable(),
    password: t.string().nullable(),
    oauth: t.json<{ wechat?: { openid: string; unionid: string } }>().hasDefault(),
    profile: t.json().hasDefault(),
    role: t.json<string[]>().hasDefault(),
    verification: t.json().hasDefault(),
    active: t.boolean().hasDefault(),
  }));

  public computed = this.setComputed((q) => ({
    profileName: q.sql`COALESCE(${q.column('profile')} ->> 'name', '')`.type((t) => t.string()),
    profileAvatar: q.sql`COALESCE(${q.column('profile')} ->> 'avatar', '')`.type((t) => t.string()),
    profileBio: q.sql`COALESCE(${q.column('profile')} ->> 'bio', '')`.type((t) => t.string()),
    profileWechatId: q.sql`COALESCE(${q.column('profile')} ->> 'wechatId', '')`.type((t) => t.string()),
    verificationVerified: q.sql`COALESCE((${q.column('verification')} ->> 'verified')::boolean, false)`.type((t) =>
      t.boolean(),
    ),
  }));

  public relations = {
    posts: this.hasMany(() => TablePost, {
      required: true,
      columns: ['id'],
      references: ['userId'],
    }),
  };
}
