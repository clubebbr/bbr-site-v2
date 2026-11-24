// Fonte de dados: Brawlytix. O total e extraido do campo "Skins Unlocked".
const VALID_TAG = /^[0289PYLQGRJCUV]{3,15}$/;

function extractSkinTotal(html) {
  if (/Just a moment|cf-chl-|Attention Required/i.test(html.slice(0, 12000))) {
    throw new Error('Desafio anti-bot/Cloudflare');
  }
  const match = html.match(/(\d[\d,]*)\s*<label\b[^>]*>\s*Skins\s+Unlocked\s*<\/label>/i);
  if (!match) throw new Error('Campo Skins Unlocked ausente');
  const total = Number(match[1].replace(/,/g, ''));
  if (!Number.isInteger(total) || total < 1 || total > 5000) throw new Error('Total de skins fora do intervalo');
  return total;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const tag = String(url.searchParams.get('tag') || '').replace(/^#/, '').toUpperCase().replace(/O/g, '0');
  if (!VALID_TAG.test(tag)) return Response.json({ ok: false, error: 'Tag invalida' }, { status: 400 });
  const cache = caches.default;
  const cacheKey = new Request('https://bbr-skins-cache.invalid/skins/' + tag);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const upstream = await fetch('https://brawlytix.com/player/' + encodeURIComponent(tag), {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; BBR-Skins-Ranking/1.0)'
      },
      signal: AbortSignal.timeout(20000)
    });
    if (!upstream.ok) throw new Error('Brawlytix HTTP ' + upstream.status);
    const total = extractSkinTotal(await upstream.text());
    const result = Response.json({ ok: true, tag: '#' + tag, total, source: 'Brawlytix' }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=21600', 'X-Content-Type-Options': 'nosniff' }
    });
    await cache.put(cacheKey, result.clone());
    return result;
  } catch {
    return Response.json({ ok: false, error: 'Total de skins indisponivel no Brawlytix' }, {
      status: 502, headers: { 'Cache-Control': 'no-store' }
    });
  }
}
