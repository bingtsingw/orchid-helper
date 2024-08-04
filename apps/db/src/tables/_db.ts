import { orchidORM } from 'orchid-orm';
import { TableUser } from './user';

export const db = orchidORM(
  {
    log: false,
    databaseURL: process.env['DATABASE_URL'],
  },
  {
    user: TableUser,
  },
);
