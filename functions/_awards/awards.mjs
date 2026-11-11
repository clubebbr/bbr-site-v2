import { skins } from './skins.mjs';
// Backend preparado para Cloudflare Pages Functions. Não implantar antes da configuração.
const START = Date.parse('2026-12-01T03:00:00Z');
const END = Date.parse('2026-12-08T03:00:00Z');
const CATEGORIES = new Set(['mitica','lendaria','mais_legal','melhor_membro','perfil','ranqueada']);
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply = (status,data)=>new Response(JSON.stringify(data),{status,headers});
export function isOpen(now=Date.now()) { return now>=START && now<END; }
export async function submit(request,env,now=Date.now()) {
  if(!isOpen(now)) return reply(403,{error:'As indicações estão fechadas.'});
  if(!env.AWARDS_DB) return reply(503,{error:'Formulário indisponível.'});
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return reply(415,{error:'Formato inválido.'});
  let body;try{body=await request.json()}catch{return reply(400,{error:'Dados inválidos.'})}
  if(!body || typeof body!=='object' || Array.isArray(body)) return reply(400,{error:'Dados inválidos.'});
  const entries=Object.entries(body);
  if(!entries.length || entries.length>6 || entries.some(([category,name])=>!CATEGORIES.has(category)||typeof name!=='string'||!name.trim()||name.trim().length>100)) return reply(400,{error:'Confira suas indicações.'});
  if(entries.some(([category,name]) => skins[category] && !skins[category].includes(name.trim()))) return reply(400,{error:'Skin inválida.'});
  const id=crypto.randomUUID();
  try {
    const statements=entries.map(([category,name])=>env.AWARDS_DB.prepare('INSERT INTO awards_nominations (submission_id, category, nominee) VALUES (?, ?, ?)').bind(id,category,name.trim()));
    await env.AWARDS_DB.batch(statements);
    return reply(201,{ok:true});
  } catch {return reply(503,{error:'Não foi possível salvar as indicações.'})}
}
export async function results(request,env){
  const secret=env.AWARDS_ADMIN_SECRET;
  if(typeof secret!=='string'||secret.length<32) return reply(503,{error:'Painel não configurado.'});
  const supplied=request.headers.get('Authorization')||'';
  const encoder=new TextEncoder(); const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  const expected=await crypto.subtle.sign('HMAC',key,encoder.encode('Bearer '+secret));
  if(!await crypto.subtle.verify('HMAC',key,expected,encoder.encode(supplied))) return reply(401,{error:'Acesso não autorizado.'});
  if(!env.AWARDS_DB) return reply(503,{error:'Painel não configurado.'});
  try{const data=await env.AWARDS_DB.prepare("SELECT category, nominee, COUNT(*) AS total FROM awards_nominations WHERE category != '__teste__' GROUP BY category, nominee ORDER BY category, total DESC, nominee").all();return reply(200,{results:data.results})}catch{return reply(503,{error:'Resultados indisponíveis.'})}
}
