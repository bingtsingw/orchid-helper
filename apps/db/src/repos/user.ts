import { createRepo } from 'orchid-orm';
import { db } from '../tables/_db';

export const operators = ['>', '<', '>=', '<=', '=', '!='] as const;

const selectForDefault = db.user.makeHelper((q) => {
  return q.select('id', 'profileName', 'profileAvatar');
});

export const user = createRepo(db.user, {
  queryMethods: {
    whereSearchName: (q, keyword?: string) => {
      // undefined or null -> search for null id
      if (keyword === undefined || keyword === null) {
        return q.where({ id: '__NOT_EXIST__' });
      }
      const _keyword = String(keyword);

      // non-empty string -> search for contains
      if (_keyword) {
        return q.where({ profileName: { contains: _keyword } });
      } else {
        return q.where({ profileName: _keyword });
      }
    },

    selectForDefault: (q) => {
      return selectForDefault(q);
    },
  },
});
