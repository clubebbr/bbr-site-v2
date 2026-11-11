import { results, submit } from '../../_awards/awards.mjs';
export async function onRequestPost({request,env}) {
  const auth=await results(request,env);
  if(!auth.ok) return auth;
  return submit(request,env,Date.now(),true);
}
