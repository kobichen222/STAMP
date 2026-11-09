/** Email one-time codes for staff login (database and mail mocked). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rows = new Map<string, unknown>();
const sent: { to?: string[]; subject: string }[] = [];

vi.mock('@/lib/mail', () => ({
  escapeHtml: (s: string) => s,
  sendMail: async (m: { to?: string[]; subject: string }) => void sent.push(m),
}));
vi.mock('@/server/store/neon', () => ({
  db: async () => (strings: TemplateStringsArray, ...v: unknown[]) => {
    const text = strings.join('?');
    if (text.startsWith('select')) return rows.has(v[0] as string) ? [{ value: rows.get(v[0] as string) }] : [];
    if (text.startsWith('insert')) rows.set(v[0] as string, JSON.parse(v[1] as string));
    if (text.startsWith('delete')) rows.delete(v[0] as string);
    return [];
  },
}));

const { requestLoginCode, roleForEmail, verifyLoginCode } = await import('@/server/admin-otp');
const codeFromMail = () => /(\d{6})/.exec(sent.at(-1)!.subject)![1];

beforeEach(() => {
  rows.clear();
  sent.length = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe('admin email codes', () => {
  it('knows the staff addresses', () => {
    expect(roleForEmail(' Yosi@Stamp2go.co.il ')).toBe('admin');
    expect(roleForEmail('someone@gmail.com')).toBeNull();
    vi.stubEnv('ADMIN_EMAILS', 'a@x.co, b@x.co');
    vi.stubEnv('PRODUCTION_EMAILS', 'p@x.co');
    expect(roleForEmail('b@x.co')).toBe('admin');
    expect(roleForEmail('yosi@stamp2go.co.il')).toBeNull();
    expect(roleForEmail('p@x.co')).toBe('production');
  });

  it('sends nothing to unknown addresses', async () => {
    expect(await requestLoginCode('someone@gmail.com')).toBe('ignored');
    expect(sent).toHaveLength(0);
  });

  it('logs in once with the mailed code', async () => {
    expect(await requestLoginCode('mira@stamp2go.co.il')).toBe('sent');
    expect(sent[0].to).toEqual(['mira@stamp2go.co.il']);
    const code = codeFromMail();
    expect(await verifyLoginCode('mira@stamp2go.co.il', code)).toBe('admin');
    expect(await verifyLoginCode('mira@stamp2go.co.il', code)).toBeNull();
  });

  it('locks after 5 wrong codes', async () => {
    await requestLoginCode('mira@stamp2go.co.il');
    const code = codeFromMail();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect(await verifyLoginCode('mira@stamp2go.co.il', wrong)).toBeNull();
    expect(await verifyLoginCode('mira@stamp2go.co.il', code)).toBeNull();
  });

  it('does not resend within a minute', async () => {
    await requestLoginCode('mira@stamp2go.co.il');
    expect(await requestLoginCode('mira@stamp2go.co.il')).toBe('wait');
    expect(sent).toHaveLength(1);
  });
});
