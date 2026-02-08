import { db, dr } from '@/src';
import { describe, expect, test } from 'bun:test';

describe('repos', () => {
  test('whereSearchName', async () => {
    const u1 = await db.user.create({ password: '1', profile: { name: '7feeAlice' } });
    const u2 = await db.user.create({ password: '2', profile: { name: 'sdlkfjBob' } });
    const u3 = await db.user.create({ password: '3', profile: { name: '' } });
    const u4 = await db.user.create({ password: '4', profile: { name: ' ' } });
    await db.user.create({ password: '5' });
    await db.user.create({ password: '6', profile: { name: 'undefined' } });
    await db.user.create({ password: '7', profile: { name: 'null' } });
    const u8 = await db.user.create({ password: '8', profile: { name: '%<!@#$^&*()_+,.{}:|?>' } });

    expect(await dr.user.whereSearchName('ali').getOptional('id')).toBe(u1.id);
    expect(await dr.user.whereSearchName('bob').getOptional('id')).toBe(u2.id);
    expect(await dr.user.whereSearchName('').getOptional('id')).toBe(u3.id);
    expect(await dr.user.whereSearchName(' ').getOptional('id')).toBe(u4.id);
    expect(await dr.user.whereSearchName().getOptional('id')).toBeUndefined();
    expect(await dr.user.whereSearchName(null!).getOptional('id')).toBeUndefined();
    expect(await dr.user.whereSearchName('%<!@#$^&*()_+,.{}:|?>').getOptional('id')).toBe(u8.id);
  });
});
