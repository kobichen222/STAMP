import 'server-only';
import { loadOrder, verifyToken } from '@/server/orders/service';

/** Tranzila posts form data (or query string on GET); our custom fields come back as sent. */
export async function readFields(req: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = Object.fromEntries(new URL(req.url).searchParams);
  if (req.method === 'POST') {
    const text = await req.text().catch(() => '');
    try {
      const json = JSON.parse(text);
      if (json && typeof json === 'object') for (const [k, v] of Object.entries(json)) out[k] = String(v);
    } catch {
      for (const [k, v] of new URLSearchParams(text)) out[k] = v;
    }
  }
  return out;
}

/** The order named by the result, only when its private token matches. */
export async function orderFor(f: Record<string, string>) {
  const id = f.order_id;
  if (!id || !/^ORD-[\w-]{4,30}$/.test(id)) return null;
  const o = await loadOrder(id);
  return verifyToken(o, f.otk ?? null) ? o : null;
}
