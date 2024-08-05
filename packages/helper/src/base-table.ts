import { createId } from '@paralleldrive/cuid2';
import type { DefaultColumnTypes, DefaultSchemaConfig } from 'orchid-orm';
import { createBaseTable } from 'orchid-orm';

const cuid = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .string(36)
    .primaryKey()
    .default(() => createId());

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

    baseColumns: () => {
      return {
        id: cuid(t)(),
        createdAt: createdAt(t)(),
        updatedAt: updatedAt(t)(),
        deletedAt: deletedAt(t)(),
      };
    },
  }),
});
