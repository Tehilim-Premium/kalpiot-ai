// "שאל את העיר" לכולם: פונקציית שרת שמעבירה את השאלה ל-Claude ומזרימה את התשובה לדפדפן.
// המפתח יושב רק בסביבת Netlify (AI Gateway מזריק ANTHROPIC_API_KEY ו-ANTHROPIC_BASE_URL). לדפדפן אין גישה אליו.
const MODEL = 'claude-opus-5-5';
const MAX_SYSTEM = 60_000;
const MAX_TURNS = 10;
const MAX_CHARS = 600;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQ_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

const limited = (ip: string) => {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_REQ_PER_WINDOW;
};
const fail = (status: number, code: string) =>
  new Response(JSON.stringify({ error: code }), { status, headers: { 'content-type': 'application/json' } });

export default async (req: Request, context: { ip?: string }) => {
  if (req.method !== 'POST') return fail(405, 'method');
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, 'not-configured');
  if (limited(context.ip ?? 'unknown')) return fail(429, 'rate');
  let body: { system?: string; messages?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return fail(400, 'json'); }
  const system = String(body.system ?? '').slice(0, MAX_SYSTEM);
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, m.role === 'user' ? MAX_CHARS : 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return fail(400, 'messages');

  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const upstream = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, output_config: { effort: 'low' }, system, messages, stream: true }),
  });
  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => '');
    return fail(upstream.status === 429 ? 429 : 502, `upstream ${upstream.status} ${txt.slice(0, 120)}`);
  }
  // pass the SSE stream through untouched; the page reads content_block_delta events
  return new Response(upstream.body, { status: 200, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' } });
};

export const config = { path: '/api/ask' };
