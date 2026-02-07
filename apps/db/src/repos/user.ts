import { createRepo } from 'orchid-orm';
import { db } from '../tables/_db';

export const operators = ['>', '<', '>=', '<=', '=', '!='] as const;

const selectForDefault = db.user.makeHelper((q) => {
  return q.select('id', 'profileName', 'profileAvatar');
});

export const user = createRepo(db.user, {
  queryMethods: {
    whereByProfileName: (q, keyword: string) => {
      // undefined or null -> search for null profileName
      if (keyword === undefined || keyword === null) {
        return q.where({ id: '__NOT_EXIST__' });
      }

      const _keyword = String(keyword);

      if (_keyword) {
        return q.where(
          q.sql<boolean>`(${q.column('profile')}->>'name')::text ILIKE $keyword`.values({
            keyword: `%${_keyword.replace(/([\%_])/g, '\\$1')}%`,
          }),
        );
      } else {
        return q.where(
          q.sql<boolean>`(${q.column('profile')}->>'name')::text = $keyword`.values({
            keyword: _keyword,
          }),
        );
      }
    },

    whereSearchName: (q, keyword?: string) => {
      // undefined or null -> search for null profileName
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
