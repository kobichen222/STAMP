import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { suggestLocally } from '@/designer/suggest';
import { rateLimit } from '@/server/rate-limit';

const Suggestion = z.object({
  style: z.enum(['minimal', 'classic', 'modern']),
  lines: z.array(z.string()).describe('Main text lines, most important first, max 6'),
  arcTop: z.string().nullable().describe('Round stamps only: text along the top arc'),
  arcBottom: z.string().nullable().describe('Round stamps only: text along the bottom arc'),
});
const Output = z.object({ suggestions: z.array(Suggestion) });

const SYSTEM = `אתה מעצב חותמות גומי בסטודיו ישראלי. הלקוח מתאר בחופשיות את החותמת שהוא צריך.
החזר בדיוק 3 הצעות לתוכן החותמת בסגנונות minimal, classic, modern (אחת מכל סגנון).
- כתוב עברית תקנית, בשורות קצרות שמתאימות לחותמת.
- השתמש בקיצורים מקובלים: עו״ד, ד״ר, מ.ר., ח.פ., ע.מ., טל׳.
- אם חסר פרט שהלקוח ביקש (למשל מספר רישיון או טלפון), שים מציין מקום ברור כמו "מ.ר. 00000" או "טל׳ 050-0000000".
- אל תמציא פרטים אישיים אמיתיים.
- בחותמת עגולה השתמש ב-arcTop/arcBottom לשם ולתואר, ובשורות למספרים. בחותמת מלבנית arcTop/arcBottom יהיו null.
- עד 5 שורות בחותמת מלבנית, עד 3 שורות במרכז חותמת עגולה.`;

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`ai:${ip}`, 10, 60_000)) return NextResponse.json({ error: 'יותר מדי בקשות, נסו שוב בעוד דקה' }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { prompt?: string; shape?: string; width?: number; height?: number } | null;
  const prompt = String(body?.prompt ?? '').slice(0, 600).trim();
  if (!prompt) return NextResponse.json({ error: 'נא לתאר את החותמת' }, { status: 400 });

  // Without an API key the assistant still works with the rule-based parser.
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ source: 'local', suggestions: suggestLocally(prompt) });

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4000,
      output_config: { effort: 'low', format: zodOutputFormat(Output) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `סוג החותמת: ${body?.shape === 'round' ? `עגולה בקוטר ${body?.width} מ"מ` : `מלבנית ${body?.width}×${body?.height} מ"מ`}\n\nבקשת הלקוח:\n${prompt}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return NextResponse.json({ source: 'local', suggestions: suggestLocally(prompt) });
    }
    const titles = { minimal: 'Minimal', classic: 'Classic', modern: 'Modern' } as const;
    return NextResponse.json({
      source: 'ai',
      suggestions: response.parsed_output.suggestions.slice(0, 3).map((s) => ({
        style: s.style,
        title: titles[s.style],
        content: { lines: s.lines.slice(0, 6), arcTop: s.arcTop ?? undefined, arcBottom: s.arcBottom ?? undefined },
      })),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn('[ai-design] rate limited');
    else if (e instanceof Anthropic.APIError) console.error(`[ai-design] API error ${e.status}`, e.message);
    else console.error('[ai-design]', e);
    return NextResponse.json({ source: 'local', suggestions: suggestLocally(prompt) });
  }
}
