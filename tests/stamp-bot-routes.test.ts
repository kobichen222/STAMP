/** The bot's two routes: same-origin check, per-IP limit, and the request's signal handed down (bot mocked). */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const bot = vi.hoisted(() => ({
  stampTurn: vi.fn(async (..._args: unknown[]) => ({ err: false, text: 'ok', stamp: null })),
  splitText: vi.fn(async (t: unknown) => [t]),
}));
vi.mock('@/stamp-bot/serve', () => ({ UNAVAILABLE: 'הבוט לא זמין כרגע', ...bot }));

const UNAVAILABLE = 'הבוט לא זמין כרגע';
let ipSeq = 0;
const freshIp = () => `10.0.0.${++ipSeq}`;

function req(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://shop.test/api/stamp-bot/${path}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': freshIp(), ...headers },
    body: JSON.stringify(body),
  });
}

async function turn(headers: Record<string, string> = {}, body: unknown = { msgs: [{ role: 'user', text: 'יוסי כהן' }] }) {
  const { POST } = await import('@/app/api/stamp-bot/turn/route');
  const res = await POST(req('turn', body, headers));
  return { status: res.status, data: await res.json() };
}

beforeEach(() => {
  bot.stampTurn.mockClear();
  bot.splitText.mockClear();
});

describe('origin check', () => {
  it('passes a request with no Origin header', async () => {
    expect((await turn()).status).toBe(200);
  });
  it('passes a request from the same host', async () => {
    expect((await turn({ origin: 'http://shop.test' })).status).toBe(200);
  });
  it('reads the host a proxy forwarded', async () => {
    expect((await turn({ origin: 'https://www.stamps.example', 'x-forwarded-host': 'www.stamps.example' })).status).toBe(200);
  });
  it('refuses another site and an opaque origin, without calling the bot', async () => {
    for (const origin of ['https://evil.example', 'http://shop.test.evil.example', 'null']) {
      const r = await turn({ origin });
      expect(r.status).toBe(403);
      expect(r.data).toEqual({ err: true, msg: UNAVAILABLE });
    }
    expect(bot.stampTurn).not.toHaveBeenCalled();
  });
});

describe('rate limit per IP', () => {
  it('turn: 60 a minute, then 429 with the unavailable sentence', async () => {
    const { POST } = await import('@/app/api/stamp-bot/turn/route');
    const ip = freshIp();
    const one = () => POST(req('turn', { msgs: [{ role: 'user', text: 'x' }] }, { 'x-forwarded-for': ip }));
    for (let i = 0; i < 60; i++) expect((await one()).status).toBe(200);
    const res = await one();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ err: true, msg: UNAVAILABLE });
    // another IP is not affected
    expect((await turn()).status).toBe(200);
  });
  it('split: 20 a minute, then 429', async () => {
    const { POST } = await import('@/app/api/stamp-bot/split/route');
    const ip = freshIp();
    const one = () => POST(req('split', { text: 'x' }, { 'x-forwarded-for': ip }));
    for (let i = 0; i < 20; i++) expect((await one()).status).toBe(200);
    const res = await one();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ err: true, msg: UNAVAILABLE });
  });
});

describe('the call itself', () => {
  it('turn: same input and result as before, with the request signal handed to the bot', async () => {
    const msgs = [{ role: 'user', text: 'יוסי כהן' }];
    const r = await turn({}, { msgs });
    expect(r.data).toEqual({ err: false, text: 'ok', stamp: null });
    expect(bot.stampTurn).toHaveBeenCalledWith(msgs, expect.any(AbortSignal));
  });
  it('split: text in, the list of pieces out, with the request signal', async () => {
    const { POST } = await import('@/app/api/stamp-bot/split/route');
    const res = await POST(req('split', { text: 'שתי חותמות' }));
    expect(await res.json()).toEqual(['שתי חותמות']);
    expect(bot.splitText).toHaveBeenCalledWith('שתי חותמות', expect.any(AbortSignal));
  });
});
