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
    const top = [...results].sort((a,b) => b.total-a.total || a.name.localeCompare(b.name,'pt-BR'));
    const rows = top.map((p,i) => ({...p, position:i+1})).filter(p => norm(p.name).includes(term));
    podium.replaceChildren();
    podium.hidden = Boolean(term);
    const avatarFor = (p, className) => {
      if (!p.iconId) return null;
      const img = document.createElement('img');
      img.className = className;
      img.src = 'https://cdn.brawlify.com/profile-icons/regular/' + encodeURIComponent(p.iconId) + '.png';
      img.alt = 'Ícone de perfil de ' + p.name;
      img.loading = 'lazy';
      return img;
    };
    if (!term) top.slice(0,3).forEach((p,i) => {
      const card = document.createElement('div');
      card.className = 'podium-card ' + ['podium-gold','podium-silver','podium-bronze'][i];
      const rank = document.createElement('div');
      rank.className = 'podium-place';
      rank.textContent = ['🥇 1º LUGAR','🥈 2º LUGAR','🥉 3º LUGAR'][i];
      const name = document.createElement('div');
      name.className = 'podium-name'; name.textContent = p.name;
      const club = document.createElement('div');
      club.className = 'podium-club'; club.textContent = p.club;
      const count = document.createElement('div');
      count.className = 'podium-trophies'; count.textContent = fmt(p.total) + ' skins';
      const avatar = avatarFor(p,'podium-avatar');
      card.append(rank);
      if (avatar) card.append(avatar);
      card.append(name,club,count);
      podium.append(card);
    });
    body.replaceChildren();
    for (const p of rows.filter(p => term || p.position>3)) {
      const tr = document.createElement('tr');
      const position = document.createElement('td');
      position.textContent = '#' + p.position;
      const name = document.createElement('td');
      const avatar = avatarFor(p,'ranking-avatar');
      if (avatar) name.append(avatar);
      const nameText = document.createElement('strong');
      nameText.textContent = p.name;
      name.append(nameText);
      const club = document.createElement('td');
      club.textContent = p.club;
      const total = document.createElement('td');
      total.textContent = fmt(p.total);
      tr.append(position,name,club,total);
      body.append(tr);
    }
    if (!rows.length) {
      const tr=document.createElement('tr'), td=document.createElement('td');
      td.colSpan=4; td.textContent=term?'Nenhum jogador encontrado no ranking.':'Aguardando resultados.';
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
        status('Atualizado em ' + when + (results.length < snapshot.consulted ? ' • Lista parcial até a próxima atualização.' : ''));
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
      seen.add(tag); members.push({tag,name:m.name||'#'+tag,club:entry.value.name||'Clube BBR',iconId:m.icon?.id||m.iconId||null});
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
      : 'Ranking atualizado • '+members.length+' jogadores consultados nos sete clubes.');
    if(failed) started=false;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('skins-ranking-search')?.addEventListener('input',render);
    const button=document.querySelector('.tab-btn[data-tab="skins"]');
    button?.addEventListener('click',load);
    if(document.getElementById('skins')?.classList.contains('active')) load();
  });
})();
