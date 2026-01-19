import { orchidORM } from 'orchid-orm';
import { TableCuid2, TableShortId, TableUuid25 } from './ids';
import { TablePost } from './post';
import { TableUser } from './user';

export const db = orchidORM(
  {
    log: false,
    databaseURL: process.env['DATABASE_URL'],
  },
  {
    user: TableUser,
    post: TablePost,
    uuid25: TableUuid25,
    cuid2: TableCuid2,
    shortId: TableShortId,
  },
);
