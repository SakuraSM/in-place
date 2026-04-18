import { createHash } from 'node:crypto';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { loadMigrationEnv } from './load-env.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
loadMigrationEnv();

async function resolveMigrationsDir() {
  const candidates = [
    path.resolve(currentDir, '../migrations'),
    path.resolve(currentDir, '../../migrations'),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`Unable to locate migrations directory. Checked: ${candidates.join(', ')}`);
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  return databaseUrl;
}

function checksumOf(contents: string) {
  return createHash('sha256').update(contents).digest('hex');
}

async function ensureMigrationTable(client: Client) {
  await client.query(`
    create table if not exists schema_migrations (
      id bigserial primary key,
      name text not null unique,
      checksum text not null,
      executed_at timestamptz not null default now()
    )
  `);
}

async function listMigrationFiles() {
  const migrationsDir = await resolveMigrationsDir();
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort()
    .map((fileName) => ({
      fileName,
      filePath: path.join(migrationsDir, fileName),
    }));
}

async function run() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
  });

  await client.connect();

  try {
    await ensureMigrationTable(client);

    const files = await listMigrationFiles();

    for (const { fileName, filePath } of files) {
      const sql = await readFile(filePath, 'utf8');
      const checksum = checksumOf(sql);

      const existing = await client.query<{
        checksum: string;
      }>('select checksum from schema_migrations where name = $1', [fileName]);

      if (existing.rowCount && existing.rows[0]?.checksum === checksum) {
        continue;
      }

      if (existing.rowCount) {
        throw new Error(`Migration checksum mismatch for ${fileName}`);
      }

      await client.query('begin');

      try {
        await client.query(sql);
        await client.query(
          'insert into schema_migrations (name, checksum) values ($1, $2)',
          [fileName, checksum],
        );
        await client.query('commit');
        console.log(`Applied migration ${fileName}`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
