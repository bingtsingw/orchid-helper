import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test';
import { db, testTransaction } from '@/src';

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
