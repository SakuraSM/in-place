import { createDb } from '@inplace/db';

let db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!db) {
    db = createDb();
  }

  return db;
}
