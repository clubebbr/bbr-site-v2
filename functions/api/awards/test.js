import { results } from '../../_awards/awards.mjs';
export async function onRequestPost({request,env}) {
  const auth=await results(request,env);
  if(!auth.ok) return auth;
  const id='test-'+crypto.randomUUID();
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  try {
    await env.AWARDS_DB.prepare('INSERT INTO awards_nominations (submission_id, category, nominee) VALUES (?, ?, ?)').bind(id,'__teste__','Teste de conexão').run();
    const check=await env.AWARDS_DB.prepare('SELECT COUNT(*) AS total FROM awards_nominations WHERE submission_id = ?').bind(id).first();
    await env.AWARDS_DB.prepare('DELETE FROM awards_nominations WHERE submission_id = ?').bind(id).run();
    if(check?.total!==1) throw new Error('Teste sem confirmação');
    return Response.json({ok:true},{headers});
  } catch {
    return Response.json({error:'Não foi possível concluir o teste. Registros de teste não aparecem nos resultados.'},{status:503,headers});
  }
}
