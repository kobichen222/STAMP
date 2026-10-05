/** Temporary admin password from the database (hash + expiry) when ADMIN_PASSWORD is not set. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

let row: unknown = null;
vi.mock('@/server/store/neon', () => ({
  databaseUrl: () => 'postgres://test',
  db: async () => async () => (row ? [{ value: row }] : []),
}));

const HASH = 'abb0ada359f2fa54f8a99faa6387ff9147f1fe7996c14b1eb503e7340e33e797'; // sha256('KOBI2100')

describe('temporary admin password', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_SECRET;
  });

  it('logs in with the temporary password and signs a valid cookie', async () => {
    row = { secret: 's3cret-from-db', tempHash: HASH, tempExpires: new Date(Date.now() + 86400_000).toISOString() };
    const auth = await import('@/server/admin-auth');
    expect(await auth.authConfigured()).toBe(true);
    expect(await auth.roleForPassword('wrong')).toBeNull();
    expect(await auth.roleForPassword('KOBI2100')).toBe('admin');
    const token = await auth.createAdminToken('admin');
    expect(await auth.verifyAdminToken(token)).toBe('admin');
    expect(await auth.verifyAdminToken(token.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')))).toBeNull();
  });

  it('rejects an expired temporary password', async () => {
    row = { secret: 's3cret-from-db', tempHash: HASH, tempExpires: new Date(Date.now() - 1000).toISOString() };
    const auth = await import('@/server/admin-auth');
    expect(await auth.authConfigured()).toBe(false);
    expect(await auth.roleForPassword('KOBI2100')).toBeNull();
  });

  it('the environment password wins over the temporary one', async () => {
    row = { secret: 'x', tempHash: HASH };
    process.env.ADMIN_PASSWORD = 'env-pass';
    const auth = await import('@/server/admin-auth');
    expect(await auth.roleForPassword('KOBI2100')).toBeNull();
    expect(await auth.roleForPassword('env-pass')).toBe('admin');
  });
});
