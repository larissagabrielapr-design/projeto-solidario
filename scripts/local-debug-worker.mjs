export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/status') {
      const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name").all();
      const files = await env.FILES.list({ limit: 20 });
      return Response.json({ D1: { binding: 'DB', tables: tables.results }, R2: { binding: 'FILES', objects: files.objects.map(o => ({ key: o.key, size: o.size })), truncated: files.truncated } });
    }
    return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>IBPV · Debug local</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;background:#f6f8fc;color:#152c50;max-width:850px;margin:60px auto;padding:24px}a,button{display:inline-block;background:#2863e5;color:white;border:0;border-radius:8px;padding:12px 18px;margin:4px;text-decoration:none;cursor:pointer}pre{background:white;padding:24px;border-radius:12px;overflow:auto}</style><h1>IBPV · Ambiente local</h1><p>Next.js + Miniflare · D1 e R2 persistentes neste computador.</p><a href="http://localhost:3000" target="_blank" rel="noopener">Abrir aplicação</a><a href="http://localhost:3000/acesso" target="_blank" rel="noopener">Abrir acesso</a><button id="refresh">Atualizar D1 e R2</button><p>Somente consulta. Nenhum dado é enviado para a Cloudflare.</p><pre id="result">Carregando…</pre><script>async function refresh(){try{const r=await fetch('/status');if(!r.ok)throw new Error('Falha ao consultar recursos');document.querySelector('#result').textContent=JSON.stringify(await r.json(),null,2)}catch(e){document.querySelector('#result').textContent=e.message}}document.querySelector('#refresh').onclick=refresh;refresh()</script></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  },
};
