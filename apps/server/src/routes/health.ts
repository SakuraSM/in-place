import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    const result = await getDb().execute(sql`select current_database() as database, now() as now`);
    const row = result.rows[0];

    return {
      status: 'ok',
      database: row?.database ?? null,
      now: row?.now ?? null,
    };
  });
};
