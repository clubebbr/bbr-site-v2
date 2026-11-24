// Teste isolado da leitura de skins do Brawlytix. Não altera o ranking nem a API em produção.
const tags = process.argv.slice(2).length ? process.argv.slice(2) : ['2JU9CUC', 'Q9JRJVYL0'];
const validTag = /^[0289PYLQGRJCUV]{3,15}$/;

async function test(tag) {
  const normalized = String(tag).replace(/^#/, '').toUpperCase().replace(/O/g, '0');
  if (!validTag.test(normalized)) return { tag, ok: false, error: 'Tag inválida' };
  const url = 'https://brawlytix.com/player/' + encodeURIComponent(normalized);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; BBR-Skins-Source-Test/1.0)'
      },
      signal: AbortSignal.timeout(20000)
    });
    const html = await response.text();
    if (!response.ok) return { tag: '#' + normalized, ok: false, status: response.status, bytes: html.length };
    if (/Just a moment|cf-chl-|Attention Required/i.test(html.slice(0, 12000))) {
      return { tag: '#' + normalized, ok: false, status: response.status, error: 'Desafio anti-bot/Cloudflare' };
    }
    const match = html.match(/(\\d[\\d,]*)\\s*<label\\b[^>]*>\\s*Skins\\s+Unlocked\\s*<\\/label>/i);
    if (!match) return { tag: '#' + normalized, ok: false, status: response.status, bytes: html.length, error: 'Campo Skins Unlocked não encontrado no HTML' };
    return { tag: '#' + normalized, ok: true, status: response.status, total: Number(match[1].replace(/,/g, '')), bytes: html.length };
  } catch (error) {
    return { tag: '#' + normalized, ok: false, error: String(error.message || error) };
  }
}

const results = [];
for (const tag of tags) results.push(await test(tag));
console.log(JSON.stringify({ source: 'Brawlytix', testedAt: new Date().toISOString(), results }, null, 2));
if (results.some(result => !result.ok)) process.exitCode = 1;
