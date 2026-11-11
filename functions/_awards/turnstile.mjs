export async function verifyTurnstile(token, secret, request, fetcher=fetch) {
  if(typeof secret!=='string'||!secret||typeof token!=='string'||!token||token.length>2048) return false;
  const body=new URLSearchParams({secret,response:token});
  const ip=request.headers.get('CF-Connecting-IP'); if(ip) body.set('remoteip',ip);
  try {
    const res=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
    if(!res.ok) return false;
    const data=await res.json();
    return data.success===true && ['clubebbr.com'].includes(data.hostname);
  } catch { return false; }
}
