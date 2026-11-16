const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const fields=['tipo','nome','tag','data','motivo','local','prazo','clube'];
const allowed=new Set(['banimento','notificacao','historico']);
const clean=v=>typeof v==='string'?v.trim():'';
async function authorized(request,env){
 const secret=env.PUNICOES_ADMIN_PASSWORD;
 const supplied=request.headers.get('X-BBR-Admin-Password')||'';
 if(typeof secret!=='string'||secret.length<12||!supplied||supplied.length>512)return false;
 const enc=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const a=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('bbr:'+supplied)));
 const b=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('bbr:'+secret)));
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
export async function onRequestGet({env,request}){
 if(!env.PUNICOES_DB)return json(503,{error:'Banco de punições ainda não configurado.'});
 const url=new URL(request.url),admin=url.searchParams.get('admin')==='1';
 if(admin&&!await authorized(request,env))return json(401,{error:'Senha inválida.'});
 try{
 const {results}=await env.PUNICOES_DB.prepare('SELECT id,tipo,nome,tag,data,motivo,local,prazo,clube,created_at,updated_at'+(admin?',contato':'')+' FROM punicoes ORDER BY id DESC LIMIT 2000').all();
 return json(200,{items:results,admin});
 }catch{return json(503,{error:'Banco de punições não inicializado.'})}
}
export async function onRequestPost({env,request}){
 if(!await authorized(request,env))return json(401,{error:'Acesso não autorizado.'});
 if(!env.PUNICOES_DB)return json(503,{error:'Banco não configurado.'});
 let body;try{body=await request.json()}catch{return json(400,{error:'JSON inválido.'})}
 if(!body||typeof body!=='object')return json(400,{error:'Dados inválidos.'});
 const obj={};for(const f of fields)obj[f]=clean(body[f]);obj.contato=clean(body.contato);
 if(!allowed.has(obj.tipo)||!obj.nome||obj.nome.length>160||Object.values(obj).some(v=>v.length>600))return json(400,{error:'Confira o tipo e o nome.'});
 try{
 if(body.id!=null){
 const id=Number(body.id);if(!Number.isSafeInteger(id)||id<1)return json(400,{error:'ID inválido.'});
 const r=await env.PUNICOES_DB.prepare('UPDATE punicoes SET tipo=?,nome=?,tag=?,data=?,motivo=?,local=?,prazo=?,clube=?,contato=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...fields.map(f=>obj[f]),obj.contato,id).run();
 if(!r.meta.changes)return json(404,{error:'Registro não encontrado.'});return json(200,{ok:true,id});
 }
 const r=await env.PUNICOES_DB.prepare('INSERT INTO punicoes (tipo,nome,tag,data,motivo,local,prazo,clube,contato) VALUES (?,?,?,?,?,?,?,?,?)').bind(...fields.map(f=>obj[f]),obj.contato).run();
 return json(201,{ok:true,id:r.meta.last_row_id});
 }catch{return json(503,{error:'Não foi possível salvar o registro.'})}
}
export async function onRequestDelete({env,request}){
 if(!await authorized(request,env))return json(401,{error:'Acesso não autorizado.'});
 if(!env.PUNICOES_DB)return json(503,{error:'Banco não configurado.'});
 const id=Number(new URL(request.url).searchParams.get('id'));
 if(!Number.isSafeInteger(id)||id<1)return json(400,{error:'ID inválido.'});
 try{await env.PUNICOES_DB.prepare('DELETE FROM punicoes WHERE id=?').bind(id).run();return json(200,{ok:true})}catch{return json(503,{error:'Não foi possível excluir.'})}
}