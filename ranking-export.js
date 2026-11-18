/* Exportação pública do Ranking Ranqueado em PNG, sem dependências. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const colors = ['#ffd45b','#d7dce7','#e7a16e'];
  const format = n => Number(n || 0).toLocaleString('pt-BR');
  function rounded(ctx,x,y,w,h,r,fill,stroke) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function label(ctx,text,x,y,maxWidth,size=32,color='#ffffff',weight=700,align='left') {
    ctx.font=weight+' '+size+'px Arial, sans-serif';
    ctx.textAlign=align;ctx.fillStyle=color;
    let s=String(text||'');
    while(s.length>2&&ctx.measureText(s).width>maxWidth)s=s.slice(0,-2)+'…';
    ctx.fillText(s,x,y);
  }
  function avatar(url) {
    return new Promise(resolve=>{
      if(!url)return resolve(null);
      const img=new Image();img.crossOrigin='anonymous';
      img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
      img.src=url;
    });
  }
  async function exportRanking() {
    const btn=$('ranked-export-button'), status=$('ranked-export-status');
    const members=typeof rankedMembers!=='undefined' ? rankedMembers : [];
    if(!members.length){status.textContent='Aguarde o carregamento do ranking.';return;}
    const tall=$('ranked-export-format').value==='story';
    const W=1080,H=tall?1920:1350;
    btn.disabled=true;status.textContent='Preparando imagem...';
    try {
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const ctx=canvas.getContext('2d');
      const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#120b20');bg.addColorStop(1,'#28113e');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      rounded(ctx,42,45,996,H-90,30,'#1c1230','#51356b');
      label(ctx,'BBR  •  RANKING RANQUEADO',W/2,116,930,42,'#ffffff',800,'center');
      label(ctx,'Os melhores da BBR | Esports',W/2,163,880,25,'#d5b7ee',500,'center');
      const podium=members.slice(0,3);
      const icons=await Promise.all(podium.map(p=>avatar(p.iconId?'https://cdn.brawlify.com/profile-icons/regular/'+p.iconId+'.png':null)));
      const cardY=202,cardH=tall?360:315,cardW=304,gap=18;
      for(let visual=0;visual<3;visual++){
        const rank=[1,0,2][visual],p=podium[rank];if(!p)continue;
        const x=66+visual*(cardW+gap),color=colors[rank];
        rounded(ctx,x,cardY,cardW,cardH,20,['#443028','#333449','#412932'][rank],color);
        label(ctx,['1º LUGAR','2º LUGAR','3º LUGAR'][rank],x+cardW/2,cardY+46,cardW-22,29,color,800,'center');
        if(icons[rank]){try{ctx.drawImage(icons[rank],x+cardW/2-42,cardY+70,84,84);}catch(_){}}
        label(ctx,p.name,x+cardW/2,cardY+190,cardW-22,27,'#ffffff',800,'center');
        if(String(p.tag||'').replace('#','').toUpperCase()==='RC0R9LG8')label(ctx,'★ CAMPEÃO RANQUEADO',x+cardW/2,cardY+222,cardW-20,17,'#ff656d',800,'center');
        label(ctx,format(p.rankedElo)+' PONTOS',x+cardW/2,cardY+cardH-38,cardW-20,28,color,800,'center');
      }
      const listTop=cardY+cardH+48,footer=H-140,rowH=tall?65:51;
      rounded(ctx,66,listTop,948,footer-listTop,18,'#211532','#503460');
      label(ctx,'CLASSIFICAÇÃO',94,listTop+44,850,30,'#e0a7ff',800);
      const limit=Math.min(members.length,3+Math.floor((footer-listTop-88)/rowH));
      for(let i=3;i<limit;i++){
        const p=members[i],y=listTop+88+(i-3)*rowH;
        if(i%2===0)rounded(ctx,82,y-rowH+12,916,rowH-4,8,'#2c1d40');
        label(ctx,'#'+(i+1),100,y,75,23,'#d3b5f1',800);
        label(ctx,p.name,194,y,610,23,'#ffffff',700);
        label(ctx,format(p.rankedElo),963,y,155,24,'#f1d5ff',800,'right');
      }
      label(ctx,'clubebbr.com',W/2,H-81,800,34,'#ffd45b',800,'center');
      label(ctx,'Ranking gerado em '+new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),W/2,H-46,900,19,'#b7a4c8',400,'center');
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw Error('Falha ao criar PNG');
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='BBR-Ranking-Ranqueado-'+(tall?'Stories':'Instagram')+'.png';
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      status.textContent='Imagem gerada! Confira seus downloads.';
    }catch(e){console.error(e);status.textContent='Não foi possível gerar a imagem. Tente novamente.';}
    finally{btn.disabled=false;}
  }
  document.addEventListener('DOMContentLoaded',()=>{$('ranked-export-button')?.addEventListener('click',exportRanking);});
})();
