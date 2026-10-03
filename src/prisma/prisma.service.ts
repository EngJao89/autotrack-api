import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';
import { PrismaClient } from '../generated/prisma/client';

function createPgPool(connectionString: string): Pool {
  const url = new URL(connectionString);
  const sslMode = (url.searchParams.get('sslmode') ?? '').toLowerCase();
  url.searchParams.delete('sslmode');
  // node-pg/Prisma can fail on Render's cert chain when sslmode stays in the URL.
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

  const config: PoolConfig = {
    connectionString: url.toString(),
  };

  if (useSsl) {
    // Render Postgres presents a cert chain that Node rejects by default.
    config.ssl = { rejectUnauthorized: false };
  }

  return new Pool(config);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    const pool = createPgPool(configService.getOrThrow<string>('DATABASE_URL'));
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
