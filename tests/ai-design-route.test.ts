/** The AI stamp designer endpoint: key lookup, what is sent to Claude, and how its answer becomes designs (SDK mocked). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const parse = vi.fn();
const made = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status = 500;
  }
  class Anthropic {
    static APIError = APIError;
    static RateLimitError = class extends APIError {};
    static AuthenticationError = class extends APIError {};
    messages = { parse };
    constructor(opts: unknown) {
      made(opts);
    }
  }
  return { default: Anthropic };
});

const post = async (body: unknown) => {
  const { POST } = await import('@/app/api/ai-design/route');
  const res = await POST(new Request('http://x/api/ai-design/', { method: 'POST', headers: { 'x-forwarded-for': String(Math.random()) }, body: JSON.stringify(body) }));
  return { status: res.status, data: await res.json() };
};
const design = (over: Record<string, unknown> = {}) => ({ title: 'יוקרתי', look: 'elegant', lines: ['עו״ד ישראל ישראלי', 'מ.ר. 12345', 'טל׳ 050-1234567'], arcTop: null, arcBottom: null, logoPlace: null, logoSize: null, ...over });
const TEXT = 'עו״ד ישראל ישראלי\nמ.ר. 12345\nטל׳ 050-1234567';

beforeEach(() => {
  parse.mockReset();
  made.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe('AI stamp designer', () => {
  it('works without a key (rule-based layout)', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('sk', '');
    const r = await post({ prompt: TEXT, shape: 'rect', width: 38, height: 14 });
    expect(r.data.source).toBe('local');
    expect(parse).not.toHaveBeenCalled();
  });

  it('uses the key stored as `sk` and turns the answer into designs', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('sk', ' sk-test ');
    parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { relevant: true, logoNote: null, designs: [design(), design({ title: 'נקי', look: 'modern' }), design({ title: 'מסגרת עבה', look: 'thick' })] } });
    const r = await post({ prompt: TEXT, brief: 'מסגרת כפולה', shape: 'rect', width: 38, height: 14, maxLines: 4 });
    expect(made).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'sk-test' }));
    expect(r.data.source).toBe('ai');
    // The customer's own lines first, then the three designs.
    expect(r.data.suggestions).toHaveLength(4);
    expect(r.data.suggestions[1]).toMatchObject({ ai: true, title: 'יוקרתי', style: 'classic', content: { look: 'elegant' } });
    expect(r.data.suggestions[2]).toMatchObject({ style: 'modern' });
    expect(r.data.suggestions[2].content.look).toBeUndefined();
    const req = parse.mock.calls[0][0];
    expect(req.model).toBe('claude-opus-5-5');
    expect(req.messages[0].content).toContain('מלבנית 38×14');
    expect(req.messages[0].content).toContain('מסגרת כפולה');
    expect(req.output_config.format.type).toBe('json_schema');
  });

  it('shows the logo to the model and applies its placement', async () => {
    vi.stubEnv('sk', 'sk-test');
    parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { relevant: true, logoNote: 'הלוגו מתאים לחותמת.', designs: [design({ logoPlace: 'top', logoSize: 'large' })] } });
    const r = await post({ prompt: TEXT, shape: 'rect', width: 58, height: 22, logo: 'data:image/png;base64,iVBORw0KGgo=' });
    const content = parse.mock.calls[0][0].messages[0].content;
    expect(content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } });
    expect(r.data.logoNote).toBe('הלוגו מתאים לחותמת.');
    expect(r.data.suggestions[1].content).toMatchObject({ logoPlace: 'top', logoScale: 1.25 });
  });

  it('declines anything that is not a stamp design', async () => {
    vi.stubEnv('sk', 'sk-test');
    parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { relevant: false, logoNote: null, designs: [] } });
    const r = await post({ prompt: 'כתוב לי שיר על הים', shape: 'rect', width: 38, height: 14 });
    expect(r.status).toBe(400);
    expect(r.data.error).toContain('חותמת');
  });

  it('adds back a detail the model dropped', async () => {
    vi.stubEnv('sk', 'sk-test');
    parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { relevant: true, logoNote: null, designs: [design({ lines: ['עו״ד ישראל ישראלי', 'מ.ר. 12345'] })] } });
    const r = await post({ prompt: TEXT, shape: 'rect', width: 38, height: 14 });
    expect(r.data.suggestions[1].content.lines.join(' ')).toContain('050-1234567');
  });

  it('falls back to the rule-based layout when the API fails', async () => {
    vi.stubEnv('sk', 'sk-test');
    parse.mockRejectedValue(new Error('boom'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await post({ prompt: TEXT, shape: 'rect', width: 38, height: 14 });
    expect(r.data.source).toBe('local');
    err.mockRestore();
  });
});
