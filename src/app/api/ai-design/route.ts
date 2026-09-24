import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureRequired, extractRequired, missingRequired, requiredLine, suggestLocally, type RequiredItem } from '@/designer/suggest';
import { rateLimit } from '@/server/rate-limit';

const Suggestion = z.object({
  style: z.enum(['minimal', 'classic', 'modern']),
  lines: z.array(z.string()).describe('Main text lines, most important first'),
  arcTop: z.string().nullable().describe('Round stamps only: text along the top arc'),
  arcBottom: z.string().nullable().describe('Round stamps only: text along the bottom arc'),
});
const Output = z.object({ suggestions: z.array(Suggestion) });

const SYSTEM = `אתה מעצב חותמות גומי בסטודיו ישראלי. הלקוח מתאר בחופשיות את החותמת שהוא צריך.
החזר בדיוק 3 הצעות לתוכן החותמת בסגנונות minimal, classic, modern (אחת מכל סגנון).

כלל עליון – דיוק מלא:
- כל פרט שהלקוח כתב חייב להופיע בכל אחת משלוש ההצעות: שמות, תארים, מקצוע, מספרים, טלפונים, כתובות, מיילים, אתרים ומשפטים במירכאות.
- העתק כל פרט מילה במילה וספרה בספרה – בלי לקצר, לתרגם, לשנות כתיב, לעגל מספרים או לשנות סדר ספרות.
- מותר רק להוסיף תווית מקובלת לפני מספר (טל׳, מ.ר., ח.פ., ע.מ., ת.ז.) ולסדר את הפרטים בשורות.
- אל תוסיף פרטים שהלקוח לא כתב. מציין מקום (כמו "טל׳ 050-0000000") רק אם הלקוח ביקש במפורש שדה ולא נתן לו ערך.
- אם יש הרבה פרטים – פצל לשורות נוספות. אסור להשמיט פרט כדי שייכנס.

עיצוב:
- עברית תקנית, שורות קצרות שמתאימות לחותמת. השורה הראשונה היא הפרט החשוב ביותר (בדרך כלל השם).
- בחותמת עגולה השתמש ב-arcTop/arcBottom לשם ולתואר, ובשורות למספרים. בחותמת מלבנית arcTop/arcBottom יהיו null.`;

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`ai:${ip}`, 10, 60_000)) return NextResponse.json({ error: 'יותר מדי בקשות, נסו שוב בעוד דקה' }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { prompt?: string; shape?: string; width?: number; height?: number } | null;
  const prompt = String(body?.prompt ?? '').slice(0, 600).trim();
  if (!prompt) return NextResponse.json({ error: 'נא לתאר את החותמת' }, { status: 400 });

  // Without an API key the assistant still works with the rule-based parser.
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ source: 'local', required: extractRequired(prompt), suggestions: suggestLocally(prompt) });

  const required = extractRequired(prompt);
  const stamp = body?.shape === 'round' ? `עגולה בקוטר ${body?.width} מ"מ` : `מלבנית ${body?.width}×${body?.height} מ"מ`;
  const checklist = required.length ? `\n\nפרטים שחייבים להופיע בדיוק כפי שנכתבו, בכל הצעה:\n${required.map((r) => `- ${requiredLine(r)}`).join('\n')}` : '';

  try {
    const client = new Anthropic();
    const ask = async (extra = '') => {
      const response = await client.messages.parse({
        model: 'claude-opus-5',
        max_tokens: 4000,
        output_config: { effort: 'low', format: zodOutputFormat(Output) },
        system: SYSTEM,
        messages: [{ role: 'user', content: `סוג החותמת: ${stamp}\n\nבקשת הלקוח:\n${prompt}${checklist}${extra}` }],
      });
      return response.stop_reason === 'refusal' ? null : response.parsed_output;
    };
    const toContent = (s: z.infer<typeof Suggestion>) => ({ lines: s.lines.map((l) => l.trim()).filter(Boolean).slice(0, 10), arcTop: s.arcTop ?? undefined, arcBottom: s.arcBottom ?? undefined });
    const missingIn = (out: z.infer<typeof Output>) => {
      const m = new Map<string, RequiredItem>();
      for (const s of out.suggestions) for (const r of missingRequired(toContent(s), required)) m.set(r.value, r);
      return [...m.values()];
    };

    let out = await ask();
    if (!out) return NextResponse.json({ source: 'local', required, suggestions: suggestLocally(prompt) });
    // One corrective round if anything the customer wrote was left out or altered.
    const missing = missingIn(out);
    if (missing.length) {
      const retry = await ask(`\n\nבהצעות הקודמות חסרו או שונו הפרטים הבאים – חובה לכלול אותם בדיוק כך:\n${missing.map((r) => `- ${requiredLine(r)}`).join('\n')}`).catch(() => null);
      if (retry && missingIn(retry).length < missing.length) out = retry;
    }
    const titles = { minimal: 'Minimal', classic: 'Classic', modern: 'Modern' } as const;
    return NextResponse.json({
      source: 'ai',
      required,
      // Safety net: anything still missing is added as its own line.
      suggestions: out.suggestions.slice(0, 3).map((s) => ({ style: s.style, title: titles[s.style], content: ensureRequired(toContent(s), required) })),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn('[ai-design] rate limited');
    else if (e instanceof Anthropic.APIError) console.error(`[ai-design] API error ${e.status}`, e.message);
    else console.error('[ai-design]', e);
    return NextResponse.json({ source: 'local', required, suggestions: suggestLocally(prompt) });
  }
}
