// Teste isolado: nao e usado pelo site em producao.
// Execute em ambiente Cloudflare Pages de preview: /api/teste-skins?tag=2JU9CUC
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const tag = (url.searchParams.get("tag") || "2JU9CUC").replace(/^#/, "").toUpperCase();
  if (!/^[0289PYLQGRJCUV]{3,15}$/.test(tag)) {
    return Response.json({ ok: false, error: "Tag invalida" }, { status: 400 });
  }
  const source = "https://brawlace.com/players/%23" + encodeURIComponent(tag) + "/skins";
  try {
    const response = await fetch(source, {
      headers: { "Accept": "text/html" },
      signal: AbortSignal.timeout(10000)
    });
    const html = await response.text();
    if (!response.ok || !/<table\\b[^>]*\\bid=["']skinsTable["']/i.test(html)) {
      return Response.json({
        ok: false, upstreamStatus: response.status,
        error: "Tabela de skins indisponivel (bloqueio, mudanca de formato ou erro)"
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const tbody = html.match(/<tbody\\b[^>]*>([\\s\\S]*?)<\\/tbody>/i);
    if (!tbody) return Response.json({ ok: false, error: "tbody nao encontrado" }, { status: 502 });
    const total = (tbody[1].match(/<tr\\b/gi) || []).length;
    return Response.json({ ok: true, tag: "#" + tag, total, upstreamStatus: response.status }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (e) {
    return Response.json({ ok: false, error: "Falha na consulta externa" }, {
      status: 502, headers: { "Cache-Control": "no-store" }
    });
  }
}
