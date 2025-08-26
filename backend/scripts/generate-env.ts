import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
let existing = '';
if (existsSync(envPath)) existing = readFileSync(envPath, 'utf-8');

// If DATABASE_URL already populated and not placeholder, exit.
if (/^DATABASE_URL=.+/m.test(existing) && !/^DATABASE_URL=\s*$/m.test(existing)) {
  console.log('DATABASE_URL already set in .env – nothing to do.');
  process.exit(0);
}

// Load current process env or fallback defaults
const host = process.env.PG_HOST || parseEnv(existing,'PG_HOST') || 'localhost';
const port = process.env.PG_PORT || parseEnv(existing,'PG_PORT') || '5432';
const user = process.env.PG_USER || parseEnv(existing,'PG_USER') || 'postgres';
const pass = process.env.PG_PASSWORD || parseEnv(existing,'PG_PASSWORD') || 'postgres';
const db   = process.env.PG_DB || parseEnv(existing,'PG_DB') || 'bugtracker';

const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?schema=public`;

let updated = existing;
if (/^DATABASE_URL=.*$/m.test(updated)) {
  updated = updated.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${url}"`);
} else {
  updated = `DATABASE_URL="${url}"\n` + updated;
}

if (!/PG_HOST=/.test(updated)) updated += `\nPG_HOST=${host}`;
if (!/PG_PORT=/.test(updated)) updated += `\nPG_PORT=${port}`;
if (!/PG_USER=/.test(updated)) updated += `\nPG_USER=${user}`;
if (!/PG_PASSWORD=/.test(updated)) updated += `\nPG_PASSWORD=${pass}`;
if (!/PG_DB=/.test(updated)) updated += `\nPG_DB=${db}`;

writeFileSync(envPath, updated, 'utf-8');
console.log('Updated .env with DATABASE_URL:', url);

function parseEnv(content: string, key: string): string | undefined {
  const m = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m?.[1];
}
