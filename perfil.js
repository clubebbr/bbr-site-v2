
/* Perfil de Jogador BBR — isolado dos rankings existentes. */
(() => {
  'use strict';
  const API = 'https://bbr-brawl-stars.onrender.com/api';
  const CDN = 'https://cdn.brawlify.com';
  const trophyIcon = 'imagens/icon_trophy.png';
  const clubIcon = 'imagens/club.png';
  const memberIcon = 'imagens/icon_members.svg';
  const byId = id => document.getElementById(id);
  const fmt = v => Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v).toLocaleString('pt-BR') : 'Não disponível';
  const cleanTag = v => String(v || '').trim().replace(/^#/, '').toUpperCase().replace(/O/g, '0');
  const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  const setImage = (id, src, fallback) => {
    const el = byId(id);
    if (!el) return;
    el.onerror = fallback ? () => { el.onerror = null; el.src = fallback; } : () => { el.hidden = true; };
    el.hidden = false;
    el.src = src;
  };
  function rankInfo(elo) {
    if (elo === null || elo === undefined || elo === '' || !Number.isFinite(Number(elo))) return null;
    const v = Number(elo);
    const starts = [0,250,500,750,1000,1250,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,6750,7500,8250,9250,10250,11250];
    const names = ['Bronze','Prata','Ouro','Diamante','Mítica','Lendária','Mestres','Pro'];
    let index = 0;
    for (let i = 0; i < starts.length; i++) if (v >= starts[i]) index = i;
    const name = names[Math.min(names.length - 1, Math.floor(index / 3))];
    const roman = ['I','II','III'][index % 3];
    const bases = ['bronze','silver','gold','diamond','mythic','legendary','masters','pro'];
    const base = bases[Math.min(bases.length - 1, Math.floor(index / 3))];
    return { name: name + (index < 18 ? ' ' + roman : ''), src: 'imagens/ranked-' + base + '.webp' };
  }
  const roleName = role => ({president:'Presidente',vicepresident:'Vice-presidente',senior:'Perito',member:'Membro'})[String(role || '').toLowerCase().replace(/[^a-z]/g,'')] || 'Membro';
  async function getJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status === 404 ? 'Jogador não encontrado. Confira a tag.' : 'Não foi possível consultar a API (HTTP ' + res.status + ').');
    return res.json();
  }
  async function lookup(event) {
    event.preventDefault();
    const tag = cleanTag(byId('profile-input').value);
    const message = byId('profile-message');
    const result = byId('profile-result');
    const button = byId('profile-button');
    if (!/^[0289PYLQGRJCUV]{3,15}$/.test(tag)) {
      message.hidden = false;
      message.textContent = 'Informe uma tag válida do Brawl Stars, como #2JU9CUC.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Pesquisando...';
    message.hidden = false;
    message.textContent = 'Consultando o perfil na API do Brawl Stars...';
    result.hidden = true;
    try {
      const player = await getJson(API + '/players/' + encodeURIComponent(tag));
      setText('profile-name', player.name || 'Jogador');
      setText('profile-tag', player.tag || '#' + tag);
      setImage('profile-avatar', CDN + '/profile-icons/regular/' + (player.icon?.id || 28000000) + '.png', CDN + '/profile-icons/regular/28000000.png');
      setText('profile-trophies', fmt(player.trophies));
      setText('profile-highest', fmt(player.highestTrophies));
      setText('profile-3v3', fmt(player['3vs3Victories']));
      setText('profile-exp', fmt(player.expLevel));
      setText('profile-solo', fmt(player.soloVictories));
      setText('profile-duo', fmt(player.duoVictories));
      setText('profile-brawlers-count', Array.isArray(player.brawlers) ? fmt(player.brawlers.length) : 'Não disponível');
      setText('profile-champ', player.isQualifiedFromChampionshipChallenge === undefined ? 'Não disponível' : player.isQualifiedFromChampionshipChallenge ? 'Sim' : 'Não');
      const club = player.club || null;
      setText('profile-club', club?.name || 'Sem clube');
      setText('profile-club-tag', club?.tag || '');
      setText('profile-role', club ? 'Consultando...' : 'Sem clube');
      setText('profile-club-members', 'Não disponível');
      setText('profile-club-trophies', 'Não disponível');
      setText('profile-chip-club', club?.name || 'Sem clube');
      setText('profile-chip-role', club ? 'Membro' : 'Sem clube');
      byId('profile-chip-bbr').hidden = !club || !['#882UJP9GR','#CQYU8RQP','#882GLYJ8C','#2GLJJJQU9','#2GP2RLLVL','#2UCVYQGGP','#2GLJJVJ9V'].includes(String(club.tag || '').toUpperCase());
      setImage('profile-club-badge', clubIcon);
      const brawlers = Array.isArray(player.brawlers) ? [...player.brawlers].sort((a,b) => Number(b.trophies || 0) - Number(a.trophies || 0)) : [];
      for (const [prefix, b] of [['profile-best', brawlers[0]],['profile-lowest', brawlers[brawlers.length - 1]]]) {
        setText(prefix + '-name', b?.name || 'Não disponível');
        setText(prefix + '-trophies', b ? fmt(b.trophies) : 'Não disponível');
        const image = byId(prefix + '-icon');
        if (b?.id) setImage(prefix + '-icon', CDN + '/brawlers/borders/' + b.id + '.png');
        else image.hidden = true;
      }
      // A API de jogador pode não disponibilizar o recorde histórico ranqueado.
      // Nunca usar o ELO atual como se fosse o recorde.
      let current = player.rankedElo ?? null;
      // Nomes de campo variam entre versões e provedores. Não confundir o ELO atual com o pico.
      // Priorizar somente campos que indiquem explicitamente um recorde/pico ranqueado.
      const peakFields = [
        'highestRankedElo', 'rankedHighestElo', 'bestRankedElo', 'rankedBestElo',
        'rankedPeakElo', 'peakRankedElo', 'rankedEloPeak', 'maxRankedElo',
        'highestRankedPoints', 'rankedHighestPoints', 'bestRankedPoints',
        'rankedAllTimeBestElo', 'allTimeHighestRankedElo', 'highestRankedScore',
        'rankedBestScore', 'bestRankedScore'
      ];
      const peakContainers = [
        player, player.ranked, player.rankedStats, player.rankedStatistics,
        player.rankedRecord, player.rankedBest, player.rankedPeak,
        player.allTimeStats
      ].filter(x => x && typeof x === 'object');
      const peakCandidates = [];
      for (const obj of peakContainers) {
        for (const key of peakFields) {
          const value = obj[key];
          if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) {
            peakCandidates.push(Number(value));
          }
        }
      }
      let record = player.highestAllTimeRankedElo ?? (peakCandidates.length ? Math.max(...peakCandidates) : null);
      const seasonRecord = player.highestSeasonRankedElo ?? null;
      // O ranking já existente pode complementar os dados atuais de membros BBR.
      if (current == null && !byId('profile-chip-bbr').hidden) {
        try {
          const data = await getJson(API + '/ranked');
          const found = (data.ranking || []).find(x => cleanTag(x.tag) === tag);
          if (found) {
            current = found.rankedElo ?? null;
            record = record ?? found.highestRankedElo ?? found.bestRankedElo ?? null;
          }
        } catch (_) { /* O perfil principal não depende da rota de ranking. */ }
      }
      setText('profile-current-elo', fmt(current));
      setText('profile-record-elo', fmt(record));
      setText('profile-season-elo', fmt(seasonRecord));
      setText('profile-diff-elo', current != null && record != null ? fmt(Math.max(0, Number(record) - Number(current))) : 'Não disponível');
      for (const [prefix, elo] of [['profile-current',current],['profile-record',record],['profile-season',seasonRecord]]) {
        const info = rankInfo(elo);
        setText(prefix + '-rank-name', info?.name || 'Divisão não disponível');
        const img = byId(prefix + '-rank-icon');
        if (info) setImage(prefix + '-rank-icon', info.src);
        else img.hidden = true;
      }
      result.hidden = false;
      message.hidden = true;
      // Clube e cargo são enriquecimentos opcionais: não atrasam o perfil.
      if (club?.tag) {
        try {
          const clubData = await getJson(API + '/club/' + encodeURIComponent(cleanTag(club.tag)));
          setText('profile-club-members', fmt((clubData.members || []).length));
          setText('profile-club-trophies', fmt(clubData.trophies));
          const member = (clubData.members || []).find(m => cleanTag(m.tag) === tag);
          const role = roleName(member?.role);
          setText('profile-role', role);
          setText('profile-chip-role', role);
          if (clubData.badgeId) setImage('profile-club-badge', CDN + '/club-badges/regular/' + clubData.badgeId + '.png', clubIcon);
        } catch (_) {
          setText('profile-role', 'Não disponível');
          setText('profile-chip-role', 'Membro');
        }
      }
    } catch (error) {
      message.hidden = false;
      message.textContent = error.message || 'Erro ao buscar perfil.';
    } finally {
      button.disabled = false;
      button.textContent = 'Pesquisar perfil';
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const form = byId('profile-form');
    if (form) form.addEventListener('submit', lookup);
    const params = new URLSearchParams(location.search);
    const tag = params.get('jogador');
    if (tag && form) { byId('profile-input').value = tag; }
  });
})();
