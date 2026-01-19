import { createId, init } from '@paralleldrive/cuid2';
import type { DefaultColumnTypes, DefaultSchemaConfig } from 'orchid-orm';
import { createBaseTable } from 'orchid-orm';
import { v7 as uuidv7 } from 'uuid';
import { uuid25encode } from './uuid25';

const cuid = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .string(36)
    .primaryKey()
    .default(() => createId());

const uuid25 = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .string(25)
    .primaryKey()
    .default(() => uuid25encode(uuidv7()));

const short = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .string(6)
    .primaryKey()
    .default(() => init({ length: 6 })());

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
    xEnum: <T extends Record<any, any>>(_: T) => t.string().asType((t) => t<T[keyof T]>()),
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

    baseColumns: (option?: { strategy: 'uuid25' | 'cuid2' | 'short' }) => {
      const id = option?.strategy === 'cuid2' ? cuid(t)() : option?.strategy === 'short' ? short(t)() : uuid25(t)();

      return {
        id,
        createdAt: createdAt(t)(),
        updatedAt: updatedAt(t)(),
        deletedAt: deletedAt(t)(),
      };
    },
  }),
});
