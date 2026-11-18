/* Ranking experimental de skins. Ativado somente ao abrir a aba. */
(() => {
  'use strict';
  const clubs = ['882UJP9GR','CQYU8RQP','882GLYJ8C','2GLJJJQU9','2GP2RLLVL','2UCVYQGGP','2GLJJVJ9V'];
  const api = 'https://bbr-brawl-stars.onrender.com/api/club/';
  const $ = id => document.getElementById(id);
  let started = false;
  let results = [];
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const fmt = n => n.toLocaleString('pt-BR');
  function render() {
    const body = $('skins-ranking-tbody');
    const podium = $('skins-ranking-podium');
    if (!body || !podium) return;
    const term = norm($('skins-ranking-search')?.value.trim());
    const top = [...results].sort((a,b) => b.total-a.total || a.name.localeCompare(b.name,'pt-BR')).slice(0,50);
    const rows = top.map((p,i) => ({...p, position:i+1})).filter(p => norm(p.name).includes(term));
    podium.replaceChildren();
    podium.hidden = Boolean(term);
    if (!term) top.slice(0,3).forEach((p,i) => {
      const card = document.createElement('div');
      card.className = 'skins-leader';
      const rank = document.createElement('strong'); rank.textContent = ['🥇','🥈','🥉'][i];
      const name = document.createElement('span'); name.textContent = p.name;
      const count = document.createElement('strong'); count.textContent = fmt(p.total) + ' skins';
      card.append(rank,name,count); podium.append(card);
    });
    body.replaceChildren();
    for (const p of rows.filter(p => term || p.position>3)) {
      const tr = document.createElement('tr');
      for (const value of [String(p.position),p.name,p.club,fmt(p.total)]) {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      }
      body.append(tr);
    }
    if (!rows.length) {
      const tr=document.createElement('tr'), td=document.createElement('td');
      td.colSpan=4; td.textContent=term?'Nenhum jogador encontrado no TOP 50.':'Aguardando resultados.';
      tr.append(td); body.append(tr);
    }
  }
  const status = s => { if ($('skins-ranking-status')) $('skins-ranking-status').textContent=s; };
  async function fetchJson(url) {
    const res=await fetch(url,{headers:{Accept:'application/json'}});
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }
  async function load() {
    if(started) return;
    started=true;
    status('Carregando último ranking salvo...');
    try {
      const snapshot = await fetchJson('/ranking-skins-data.json');
      if (snapshot && Array.isArray(snapshot.players) && snapshot.players.length > 0) {
        results = snapshot.players.filter(p => Number.isInteger(p.total));
        render();
        const when = snapshot.updatedAt ? new Date(snapshot.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'desconhecida';
        status('Atualizado em ' + when);
        return;
      }
    } catch (_) { /* Sem snapshot: permite teste manual na prévia. */ }
    status('Primeira consulta: buscando membros dos sete clubes...');
    const clubResults=await Promise.allSettled(clubs.map(tag=>fetchJson(api+tag)));
    const okClubs=clubResults.filter(r=>r.status==='fulfilled' && Array.isArray(r.value.members));
    if(okClubs.length!==clubs.length) {
      status('Não foi possível consultar todos os sete clubes. Ranking não gerado para evitar resultado incompleto.');
      started=false; return;
    }
    const seen=new Set(), members=[];
    for(const entry of okClubs) for(const m of entry.value.members) {
      const tag=String(m.tag||'').replace(/^#/,'').toUpperCase();
      if(!tag || seen.has(tag)) continue;
      seen.add(tag); members.push({tag,name:m.name||'#'+tag,club:entry.value.name||'Clube BBR'});
    }
    if(!members.length) {status('Nenhum membro encontrado.');started=false;return;}
    status('Consultando skins: 0 de '+members.length+' jogadores...');
    let index=0,done=0,failed=0;
    results=[];
    async function worker() {
      while(index<members.length) {
        const p=members[index++];
        try {
          const data=await fetchJson('/api/skins?tag='+encodeURIComponent(p.tag));
          if(data.ok && Number.isInteger(data.total)) results.push({...p,total:data.total});
          else failed++;
        } catch { failed++; }
        done++;
        if(done%5===0 || done===members.length) {
          status('Consultando skins: '+done+' de '+members.length+' jogadores'+(failed?' • '+failed+' falha(s)':'')+'...');
          render();
        }
        await new Promise(resolve=>setTimeout(resolve,350));
      }
    }
    await Promise.all([worker(),worker(),worker()]);
    render();
    status(failed
      ? 'Consulta parcial: '+(members.length-failed)+' de '+members.length+' jogadores. '+failed+' falha(s). Classificação provisória, não definitiva.'
      : 'TOP 50 atualizado • '+members.length+' jogadores consultados nos sete clubes.');
    if(failed) started=false;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('skins-ranking-search')?.addEventListener('input',render);
    const button=document.querySelector('.tab-btn[data-tab="skins"]');
    button?.addEventListener('click',load);
    if(document.getElementById('skins')?.classList.contains('active')) load();
  });
})();
