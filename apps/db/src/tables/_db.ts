import { orchidORM } from 'orchid-orm/node-postgres';
import { TablePost } from './post';
import { TableUser } from './user';

export const db = orchidORM(
  {
    log: process.env['DATABASE_LOG'] === 'true',
    databaseURL: process.env['DATABASE_URL'],
  },
  {
    user: TableUser,
    post: TablePost,
  },
);
