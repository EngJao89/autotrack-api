import {
  applyE2eDatabaseEnv,
  ensureE2eDatabaseExists,
  migrateE2eDatabase,
} from './database';

export default async function globalSetup(): Promise<void> {
  applyE2eDatabaseEnv();
  await ensureE2eDatabaseExists();
  migrateE2eDatabase();
}
