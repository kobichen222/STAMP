import { NextResponse } from 'next/server';
import { stampTurn } from '@/stamp-bot/serve';
import { refuse } from '../guard';

/**
 * One turn of one stamp card on the home page: { msgs } in, the card's result out.
 * A route and not a server action, so the cards the home box runs at once really run together; when the browser
 * stops waiting (the card's time ran out, or it was removed) the request's signal ends the bot's call.
 */
export async function POST(req: Request) {
  const no = refuse(req, 'bot-turn', 60);
  if (no) return no;
  const body = (await req.json().catch(() => null)) as { msgs?: unknown } | null;
  return NextResponse.json(await stampTurn(body?.msgs, req.signal));
}
