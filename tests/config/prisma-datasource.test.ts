import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const schemaSource = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const migrationsDir = join(process.cwd(), 'prisma/migrations');
const migrationSources = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readFileSync(join(migrationsDir, entry.name, 'migration.sql'), 'utf8'))
  .join('\n');

describe('Prisma datasource', () => {
  it('matches the production PostgreSQL database URL documented for deployment', () => {
    expect(schemaSource).toContain('provider = "postgresql"');
    expect(schemaSource).toContain('url      = env("DATABASE_URL")');
  });

  it('does not keep SQLite-only migration SQL in the production migration history', () => {
    expect(migrationSources).not.toContain('PRAGMA');
    expect(migrationSources).not.toContain('DATETIME');
    expect(migrationSources).not.toContain('PRIMARY KEY AUTOINCREMENT');
  });
});
