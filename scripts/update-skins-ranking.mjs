// Gera um snapshot estatico do ranking de skins para Cloudflare Pages.
// Executado por GitHub Actions a cada 6 horas; sem dependencias externas.
import { writeFile } from 'node:fs/promises';
const clubs=['882UJP9GR','CQYU8RQP','882GLYJ8C','2GLJJJQU9','2GP2RLLVL','2UCVYQGGP','2GLJJVJ9V'];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(url,accept='application/json') {
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const response=await fetch(url,{headers:{Accept:accept,'User-Agent':'BBR-Skins-Ranking/1.0'},signal:AbortSignal.timeout(20000)});
      if(!response.ok) {
        if(response.status===429 || response.status>=500) {await wait(2000*(attempt+1));continue;}
        throw Error('HTTP '+response.status);
      }
      return accept==='text/html'?response.text():response.json();
    } catch(e) {
      if(attempt===2) throw e;
      await wait(2000*(attempt+1));
    }
  }
  throw Error('Falha na consulta: '+url);
}
const clubResults=await Promise.allSettled(clubs.map(tag=>get('https://bbr-brawl-stars.onrender.com/api/club/'+tag)));
if(clubResults.some(x=>x.status!=='fulfilled'||!Array.isArray(x.value.members))) throw Error('Clubes incompletos: snapshot anterior preservado');
const seen=new Set(),members=[];
for(const r of clubResults) for(const m of r.value.members) {
  const tag=String(m.tag||'').replace(/^#/,'').toUpperCase();
  if(!/^[0289PYLQGRJCUV]{3,15}$/.test(tag)||seen.has(tag)) continue;
  seen.add(tag);members.push({tag,name:m.name||'#'+tag,club:r.value.name||'BBR'});
}
if(members.length<30) throw Error('Quantidade inesperada de membros: '+members.length);
const results=[],failures=[];let cursor=0;
async function worker() {
  while(cursor<members.length) {
    const m=members[cursor++];
    try {
      const html=await get('https://brawlace.com/players/%23'+encodeURIComponent(m.tag)+'/skins','text/html');
      if(!/<table\\b[^>]*\\bid=["']skinsTable["']/i.test(html)) throw Error('Tabela ausente');
      const tbody=html.match(/<tbody\\b[^>]*>([\\s\\S]*?)<\\/tbody>/i);
      if(!tbody) throw Error('Corpo da tabela ausente');
      const total=(tbody[1].match(/<tr\\b/gi)||[]).length;
      if(total<1||total>5000) throw Error('Total fora do intervalo');
      results.push({...m,total});
    } catch(e) {failures.push({tag:m.tag,error:String(e.message||e)});}
    await wait(400);
  }
}
await Promise.all([worker(),worker(),worker()]);
console.log('Membros:',members.length,'consultados:',results.length,'falhas:',failures.length);
if(failures.length) {
  console.error('Falhas:',JSON.stringify(failures));
  throw Error('Snapshot nao atualizado: '+failures.length+' consulta(s) falharam');
}
results.sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR'));
const snapshot={updatedAt:new Date().toISOString(),consulted:members.length,clubs:clubs.length,players:results.slice(0,50)};
await writeFile('ranking-skins-data.json',JSON.stringify(snapshot,null,2)+'\n');
console.log('TOP 50 salvo:',results.length,'jogadores verificados');
