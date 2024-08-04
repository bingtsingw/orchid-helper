import { db, testTransaction } from '@/src';
import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test';

beforeAll(async () => {
  await testTransaction.start(db);
});

beforeEach(async () => {
  await testTransaction.start(db);
});

afterEach(async () => {
  await testTransaction.rollback(db);
});

afterAll(async () => {
  await testTransaction.close(db);
});
