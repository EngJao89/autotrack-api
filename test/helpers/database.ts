import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Isolated E2E database URL.
 *
 * After ATP-22 the runtime uses PostgreSQL (not SQLite). Isolation is achieved
 * with a dedicated database (`autotrack_e2e`) instead of the development DB.
 * `*.db` files remain gitignored if a future SQLite strategy is introduced.
 */
export function getE2eDatabaseUrl(): string {
  return (
    process.env.E2E_DATABASE_URL ??
    'postgresql://autotrack:autotrack@localhost:5433/autotrack_e2e?schema=public'
  );
}

export function applyE2eDatabaseEnv(): void {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.LOCAL_USER_ID_HEADER_ENABLED = 'true';
  process.env.DATABASE_URL = getE2eDatabaseUrl();
}

function parseDatabaseName(connectionString: string): string {
  const url = new URL(connectionString);
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

export async function ensureE2eDatabaseExists(): Promise<void> {
  const connectionString = getE2eDatabaseUrl();
  const databaseName = parseDatabaseName(connectionString);
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if ((result.rowCount ?? 0) === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

export function migrateE2eDatabase(): void {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: getE2eDatabaseUrl(),
    },
  });
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.maintenance.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
}
