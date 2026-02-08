import { db, dr } from '@/src';
import { describe, expect, test } from 'bun:test';

describe('repos', () => {
  test('whereSearchName', async () => {
    const u1 = await db.user.create({ profile: { name: '7feeAlice' } });
    const u2 = await db.user.create({ profile: { name: 'sdlkfjBob' } });
    const u3 = await db.user.create({ profile: { name: '' } });
    const u4 = await db.user.create({ profile: { name: ' ' } });
    const u5 = await db.user.create({ profile: { name: 'undefined' } });
    const u6 = await db.user.create({ profile: { name: 'null' } });
    const u8 = await db.user.create({ profile: { name: '%<!@#$^&*()_+,.{}:|?>' } });

    expect(await dr.user.whereSearchName('ali').getOptional('id')).toBe(u1.id);
    expect(await dr.user.whereSearchName('bob').getOptional('id')).toBe(u2.id);
    expect(await dr.user.whereSearchName('').getOptional('id')).toBe(u3.id);
    expect(await dr.user.whereSearchName(' ').getOptional('id')).toBe(u4.id);
    expect(await dr.user.whereSearchName(undefined!).getOptional('id')).toBeUndefined();
    expect(await dr.user.whereSearchName(null!).getOptional('id')).toBeUndefined();
    expect(await dr.user.whereSearchName('u')).toMatchObject([{ id: u5.id }, { id: u6.id }]);
    expect(await dr.user.whereSearchName('%<!@#$^&*()_+,.{}:|?>').getOptional('id')).toBe(u8.id);
    expect(await dr.user.whereSearchName('%').getOptional('id')).toBe(u8.id);
  });
});
