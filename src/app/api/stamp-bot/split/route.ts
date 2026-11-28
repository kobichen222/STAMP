import { NextResponse } from 'next/server';
import { splitText } from '@/stamp-bot/serve';
import { refuse } from '../guard';

/**
 * Cuts one message of the home box into the text of each stamp: { text } in, a list of texts out
 * (at least one piece for any text; on any doubt the whole message is one stamp).
 * A route and not a server action, so it never queues behind (or ahead of) the cards' turns.
 */
export async function POST(req: Request) {
  const no = refuse(req, 'bot-split', 20);
  if (no) return no;
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  return NextResponse.json(await splitText(body?.text, req.signal));
}
