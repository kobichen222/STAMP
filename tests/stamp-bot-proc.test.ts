/** The CLI pool's abort path: an aborted ask kills only its own process and leaves the pool with fresh ones (CLI mocked). */
import { describe, expect, it, vi } from 'vitest';

type FakeChild = {
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; on: (...a: unknown[]) => unknown };
  stdout: { emit: (ev: string, chunk: string) => boolean };
  kill: ReturnType<typeof vi.fn>;
  pid: undefined;
};

const h = vi.hoisted(() => ({ children: [] as FakeChild[] }));

vi.mock('child_process', async () => {
  const { EventEmitter } = await import('node:events');
  const spawn = vi.fn(() => {
    const child = Object.assign(new EventEmitter(), {
      stdin: Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn() }),
      stdout: new EventEmitter(),
      kill: vi.fn(),
      pid: undefined, // no pid: the pool ends it with kill(), never with taskkill
    });
    h.children.push(child as unknown as FakeChild);
    return child;
  });
  return { spawn, default: { spawn } };
});

// no temp dirs on disk
vi.mock('fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('fs')>();
  const fake = { ...real, mkdtempSync: () => 'stamps-test', writeFileSync: () => undefined, rmSync: () => undefined };
  return { ...fake, default: fake };
});

const pool = (sys: string) => ((globalThis as { __stampPools?: Map<string, { child: unknown; dead: boolean }[]> }).__stampPools?.get(sys) ?? []);

describe('ask with an abort signal', () => {
  it('an abort mid-call rejects, kills that process only, and the pool holds fresh processes', async () => {
    const { ask, AskAborted } = await import('@/stamp-bot/proc');
    const before = h.children.length;
    const call = new AbortController();
    const p = ask('SYS-A', 'שלום', call.signal);
    const used = h.children[before]; // no warm process yet: the call spawned its own, then the pool was filled
    expect(used.stdin.write).toHaveBeenCalledTimes(1);
    call.abort();
    await expect(p).rejects.toBeInstanceOf(AskAborted);
    expect(used.kill).toHaveBeenCalledTimes(1);

    const idle = pool('SYS-A');
    expect(idle.length).toBe(2);
    expect(idle.map((x) => x.child)).not.toContain(used);
    expect(idle.every((x) => !x.dead)).toBe(true);
    for (const x of idle) expect((x.child as FakeChild).kill).not.toHaveBeenCalled();
  });

  it('a signal already aborted takes no process at all', async () => {
    const { ask, AskAborted } = await import('@/stamp-bot/proc');
    const before = h.children.length;
    const call = new AbortController();
    call.abort();
    await expect(ask('SYS-B', 'שלום', call.signal)).rejects.toBeInstanceOf(AskAborted);
    expect(h.children.length).toBe(before);
    expect(pool('SYS-B').length).toBe(0);
  });

  it('an answer resolves; a later abort does nothing more', async () => {
    const { ask } = await import('@/stamp-bot/proc');
    const before = h.children.length;
    const call = new AbortController();
    const p = ask('SYS-C', 'שלום', call.signal);
    const used = h.children[before];
    const ev = { type: 'assistant', message: { model: 'opus', content: [{ type: 'text', text: '{"ok":1}' }] } };
    used.stdout.emit('data', JSON.stringify(ev) + '\n');
    await expect(p).resolves.toBe('{"ok":1}');
    expect(used.kill).toHaveBeenCalledTimes(1); // single use: it served its one message
    call.abort();
    expect(used.kill).toHaveBeenCalledTimes(1);
    expect(pool('SYS-C').length).toBe(2);
  });
});
