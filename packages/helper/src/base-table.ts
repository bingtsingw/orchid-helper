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
    .createdAt //
    .default(() => new Date().toISOString())
    .parse((v: any): Date => (v ? new Date(v) : v));

const updatedAt = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .timestampsNoTZ()
    .updatedAt //
    .default(() => new Date().toISOString())
    .parse((v: any): Date => (v ? new Date(v) : v));

const deletedAt = (t: DefaultColumnTypes<DefaultSchemaConfig>) => () =>
  t
    .timestampNoTZ()
    .parse((v: any): Date => (v ? new Date(v) : v))
    .nullable();

export const BaseTable = createBaseTable({
  snakeCase: true,
  nowSQL: `now()::timestamptz(3) AT TIME ZONE 'UTC'`,

  columnTypes: (t) => ({
    ...t,

    // Extend built-in methods
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    xEnum: <T extends Record<any, any>>(_: T) =>
      t
        .string()
        .encode((v: T[keyof T]) => v)
        .parse((v) => v as unknown as T[keyof T]),
    // xJsonText: () => t.jsonText().encode((v: Record<string, any> | any[]) => stringify(v)),
    xTimestamp: () => t.timestampNoTZ().parse((v: any): Date => (v ? new Date(v) : v)),

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
