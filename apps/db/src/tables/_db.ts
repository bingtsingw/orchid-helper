import { orchidORM } from 'orchid-orm/node-postgres';
import { TableCuid2, TableShortId, TableUuid25 } from './ids';
import { TablePost } from './post';
import { TableUser } from './user';

export const db = orchidORM(
  {
    log: process.env['DATABASE_LOG'] === 'true',
    databaseURL: process.env['DATABASE_URL'],
  },
  {
    cuid2: TableCuid2,
    shortId: TableShortId,
    uuid25: TableUuid25,

    user: TableUser,
    post: TablePost,
  },
);
