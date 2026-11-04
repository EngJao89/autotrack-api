#!/usr/bin/env node
/**
 * Render start entrypoint: apply Prisma migrations, heal empty/broken schema, then boot Nest.
 *
 * Why: health can be "database up" while public."User" is missing (migrate never ran,
 * dashboard Start Command override, or _prisma_migrations drift). migrate deploy alone
 * is a no-op when history says applied but tables were dropped.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

import 'dotenv/config';

const require = createRequire(import.meta.url);

function run(command, args, { allowFail = false } = {}) {
  console.log(`[render-start] $ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFail) {
    process.exit(result.status ?? 1);
  }
  return result.status ?? 0;
}

function createPool(connectionString) {
  const { Pool } = require('pg');
  const url = new URL(connectionString);
  const sslMode = (url.searchParams.get('sslmode') ?? '').toLowerCase();
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslcert');
  url.searchParams.delete('sslkey');
  url.searchParams.delete('sslrootcert');

  const host = url.hostname.toLowerCase();
  const managedHost =
    host.includes('render.com') ||
    host.includes('neon.tech') ||
    host.includes('supabase.co') ||
    host.includes('amazonaws.com');

  const useSsl =
    process.env.PGSSL === 'true' ||
    managedHost ||
    ['require', 'verify-ca', 'verify-full', 'prefer', 'no-verify'].includes(
      sslMode,
    );

  /** @type {import('pg').PoolConfig} */
  const config = { connectionString: url.toString() };
  if (useSsl) {
    config.ssl = { rejectUnauthorized: false };
  }
  return new Pool(config);
}

async function userTableExists(databaseUrl) {
  const pool = createPool(databaseUrl);
  try {
    const result = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'User'
       ) AS "exists"`,
    );
    return Boolean(result.rows[0]?.exists);
  } finally {
    await pool.end();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[render-start] DATABASE_URL is required');
    process.exit(1);
  }

  run('npx', ['prisma', 'migrate', 'status'], { allowFail: true });
  run('npx', ['prisma', 'migrate', 'deploy']);

  let hasUser = await userTableExists(databaseUrl);
  if (!hasUser) {
    console.error(
      '[render-start] public."User" missing after migrate deploy — schema history is out of sync; running migrate reset --force',
    );
    run('npx', ['prisma', 'migrate', 'reset', '--force', '--skip-seed']);
    hasUser = await userTableExists(databaseUrl);
  }

  if (!hasUser) {
    console.error(
      '[render-start] public."User" still missing after reset. Check DATABASE_URL and Render Start Command (must be npm run start:render).',
    );
    process.exit(1);
  }

  console.log('[render-start] schema ok — starting API');
  const boot = spawnSync(process.execPath, ['dist/main'], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(boot.status ?? 1);
}

main().catch((error) => {
  console.error('[render-start] failed', error);
  process.exit(1);
});
