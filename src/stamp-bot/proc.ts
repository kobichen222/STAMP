// NOT a 'use server' file on purpose - server-internal. small pools of PRE-SPAWNED, SINGLE-USE headless Claude Code
// processes, one pool per system prompt (the bot has two: extract and place): a request takes a warm one of its
// prompt, sends ONE message, reads the answer and the process dies; a fresh one takes its place. nothing outlives a
// request, so one customer's messages can never reach another customer's conversation.
// rides this machine's Claude login (or CLAUDE_CODE_OAUTH_TOKEN when it is set, e.g. on a server) - no API key, no extra cost
import { spawn, type ChildProcess } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

type Proc = {
  sys: string
  child: ChildProcess
  dir: string
  buf: string
  dead: boolean
  idle?: NodeJS.Timeout
  pending: null | { resolve: (s: string) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }
}

const POOL = 2 // warm processes per prompt
const IDLE_MS = 10 * 60_000
const ASK_TIMEOUT = 120_000
const WIN = process.platform === 'win32'
// `--tools ""` disables every built-in tool. the win32 shell drops an empty arg, so there it must be quoted
const NO_TOOLS = WIN ? '""' : ''

// a timeout is not retried: the customer already waited the whole of it
export class AskTimeout extends Error {}

// the idle processes of every prompt in use. on globalThis so Next dev hot-reloads reuse the pools instead of leaking live processes
const pools = ((globalThis as { __stampPools?: Map<string, Proc[]> }).__stampPools ??= new Map<string, Proc[]>())

function idleOf(sys: string) {
  let idle = pools.get(sys)
  if (!idle) pools.set(sys, (idle = []))
  return idle
}

function fill(sys: string) {
  const idle = idleOf(sys)
  while (idle.length < POOL) idle.push(spawnProc(sys))
}

function spawnProc(sys: string): Proc {
  // empty temp dir as cwd, holding only the system prompt file (a multi-KB argv would be mangled by the win32 shell)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stamps-'))
  fs.writeFileSync(path.join(dir, 'system.md'), sys)
  const env: NodeJS.ProcessEnv = { ...process.env, MAX_THINKING_TOKENS: '0' }
  delete env.ANTHROPIC_API_KEY // an API key would override the subscription login

  const child = spawn(
    'claude',
    // stream-json in lets the process boot now and get its one message later; --verbose is required for stream-json output.
    // strict-mcp-config skips loading the user's MCP servers - worth ~15s+ of startup.
    // no-session-persistence: the customer's messages are not written to a session file on this machine
    ['-p', '--model', 'opus', '--strict-mcp-config', '--no-session-persistence', '--system-prompt-file', 'system.md', '--tools', NO_TOOLS, '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose'],
    { cwd: dir, env, windowsHide: true, shell: WIN, stdio: ['pipe', 'pipe', 'ignore'] },
  )

  const proc: Proc = { sys, child, dir, buf: '', dead: false, pending: null }
  proc.idle = setTimeout(() => killProc(proc), IDLE_MS)

  child.stdin!.on('error', () => {}) // EPIPE on a dying child - the exit handler cleans up
  child.stdout!.on('data', (chunk) => {
    proc.buf += chunk.toString()
    let idx: number
    while ((idx = proc.buf.indexOf('\n')) >= 0) {
      const line = proc.buf.slice(0, idx).trim()
      proc.buf = proc.buf.slice(idx + 1)
      if (line && proc.pending) onEvent(proc, line)
    }
  })
  child.on('error', () => killProc(proc))
  child.on('exit', () => killProc(proc))
  return proc
}

type Ev = { type?: string; subtype?: string; is_error?: boolean; result?: string; error?: unknown; message?: { model?: string; content?: { type?: string; text?: string }[] } }

function onEvent(proc: Proc, line: string) {
  let ev: Ev
  try {
    ev = JSON.parse(line)
  } catch {
    return
  }
  // the answer is in the assistant event; the result event comes ~2s later, after a summary nobody here reads.
  // a synthetic assistant message is the CLI's own error text (not logged in, rate limit) - that waits for the result
  if (ev.type === 'assistant' && !ev.error && ev.message?.model !== '<synthetic>') {
    const text = (ev.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
    if (text.trim()) settle(proc, text)
    return
  }
  if (ev.type !== 'result') return
  if (ev.subtype === 'success' && !ev.is_error) settle(proc, String(ev.result ?? ''))
  else settle(proc, new Error(String(ev.result || ev.subtype)))
}

function settle(proc: Proc, v: string | Error) {
  const p = proc.pending
  if (!p) return
  proc.pending = null
  clearTimeout(p.timer)
  if (v instanceof Error) p.reject(v)
  else p.resolve(v)
  killProc(proc) // single use: it has served its one message
}

function killProc(proc: Proc) {
  const idle = pools.get(proc.sys)
  const i = idle?.indexOf(proc) ?? -1
  if (i >= 0) idle!.splice(i, 1)
  if (proc.pending) settle(proc, new Error('חיבור ה-AI נסגר'))
  if (proc.dead) return
  proc.dead = true
  clearTimeout(proc.idle)
  // on win32 the child is the shell: killing it alone would leave claude running
  if (WIN && proc.child.pid) spawn('taskkill', ['/pid', String(proc.child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {})
  else proc.child.kill()
  setTimeout(() => rmDir(proc.dir), RM_MS) // windows holds the cwd until the process is really gone
}

const RM_MS = 2000

function rmDir(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {} // an empty temp dir lingering is harmless
}

// `systems` are the prompts in use: fills a pool for each. a prompt not among them (prompt.ts edited, or new looks)
// loses its pool - the processes spawned with it are killed
export function warmPool(...systems: string[]) {
  for (const [sys, idle] of [...pools]) {
    if (systems.includes(sys)) continue
    for (const p of [...idle]) killProc(p)
    pools.delete(sys)
  }
  for (const sys of systems) fill(sys)
}

// one message to a process of its own, from that prompt's pool. never touches the other prompts' pools.
// rejects on timeout (AskTimeout) or when the process dies
export function ask(sys: string, text: string): Promise<string> {
  const proc = idleOf(sys).shift() ?? spawnProc(sys)
  fill(sys) // its replacement boots while this one answers
  clearTimeout(proc.idle)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => settle(proc, new AskTimeout('timeout')), ASK_TIMEOUT)
    proc.pending = { resolve, reject, timer }
    proc.child.stdin!.write(JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } }) + '\n')
    proc.child.stdin!.end() // one message and no more: the process answers it and exits
  })
}

// the evals end with this, so no warm process and no temp dir outlives them
export async function closePool() {
  for (const idle of [...pools.values()]) for (const p of [...idle]) killProc(p)
  pools.clear()
  await new Promise((r) => setTimeout(r, RM_MS + 500))
}
