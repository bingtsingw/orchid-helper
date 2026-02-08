import { cuid2 } from '@xstools/utility/cuid2';
import { uuid25encode } from '@xstools/utility/string';
import type { DefaultColumnTypes, DefaultSchemaConfig } from 'orchid-orm';
import { createBaseTable } from 'orchid-orm';
import { v7 } from 'uuid';

const cuid = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .string(36)
    .primaryKey()
    .default(() => cuid2());

const uuid25 = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .string(36)
    .primaryKey()
    .default(() => {
      let uuid = '';
      if (typeof Bun !== 'undefined') {
        uuid = Bun.randomUUIDv7();
      } else {
        uuid = v7();
      }
      return uuid25encode(uuid);
    });

const shortid = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .string(36)
    .primaryKey()
    .default(() => cuid2(6));

const createdAt = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .timestampsNoTZ()
    .createdAt.default(() => new Date().toISOString())
    .asDate();

const updatedAt = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .timestampsNoTZ()
    .updatedAt.default(() => new Date().toISOString())
    .asDate();

const deletedAt = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () => t.timestampNoTZ().asDate().nullable();

export const BaseTable = createBaseTable({
  snakeCase: true,
  nowSQL: `now()::timestamptz(3) AT TIME ZONE 'UTC'`,

  columnTypes: (t) => ({
    ...t,

    // Extend built-in methods
    xEnum: <T extends Record<any, any>>(_: T) => t.string().narrowType((t) => t<T[keyof T]>()),
    xJsonText: () =>
      t.jsonText().encode((v: Record<string, any> | any[]) => {
        if (typeof v !== 'object') throw new Error('Invalid value for JSON column');

        return JSON.stringify(v);
      }),
    xTimestamp: () => t.timestampNoTZ().asDate(),

    // Add new methods
    createdAt: createdAt(t),
    updatedAt: updatedAt(t),
    deletedAt: deletedAt(t),
    cuid: cuid(t),

    // default to uuid25
    baseColumns: (option?: { strategy: 'uuid25' | 'cuid2' | 'shortid' }) => {
      const id = option?.strategy === 'cuid2' ? cuid(t)() : option?.strategy === 'shortid' ? shortid(t)() : uuid25(t)();

      return {
        id,
        createdAt: createdAt(t)(),
        updatedAt: updatedAt(t)(),
        deletedAt: deletedAt(t)(),
      };
    },
  }),
});
