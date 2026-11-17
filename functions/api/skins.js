// Fonte nao oficial: Brawl Ace. Integracao experimental, somente na branch de preview.
const VALID_TAG = /^[0289PYLQGRJCUV]{3,15}$/;
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const tag = String(url.searchParams.get('tag') || '').replace(/^#/, '').toUpperCase().replace(/O/g, '0');
  if (!VALID_TAG.test(tag)) return Response.json({ ok: false, error: 'Tag invalida' }, { status: 400 });
  const cache = caches.default;
  const cacheKey = new Request('https://bbr-skins-cache.invalid/skins/' + tag);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const upstream = await fetch('https://brawlace.com/players/%23' + encodeURIComponent(tag) + '/skins', {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(10000)
    });
    if (!upstream.ok) throw new Error('upstream ' + upstream.status);
    const html = await upstream.text();
    if (!/<table\b[^>]*\bid=["']skinsTable["']/i.test(html)) throw new Error('table missing');
    const body = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!body) throw new Error('tbody missing');
    const total = (body[1].match(/<tr\b/gi) || []).length;
    if (total < 1 || total > 5000) throw new Error('unexpected count');
    const result = Response.json({ ok: true, tag: '#' + tag, total, source: 'Brawl Ace' }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=21600', 'X-Content-Type-Options': 'nosniff' }
    });
    await cache.put(cacheKey, result.clone());
    return result;
  } catch {
    return Response.json({ ok: false, error: 'Total de skins indisponivel' }, {
      status: 502, headers: { 'Cache-Control': 'no-store' }
    });
  }
}
