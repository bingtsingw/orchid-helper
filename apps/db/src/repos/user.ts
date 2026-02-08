import { createRepo } from 'orchid-orm';
import { db } from '../tables/_db';

export const user = createRepo(db.user, {
  queryMethods: {
    whereSearchName: (q, keyword?: string) => {
      if (keyword === undefined || keyword === null) {
        return q.where({ id: '__NOT_EXIST__' });
      }

      const _keyword = String(keyword);

      if (_keyword) {
        return q.where({ profileName: { contains: _keyword } });
      } else {
        return q.where({ profileName: _keyword });
      }
    },
  },
});
