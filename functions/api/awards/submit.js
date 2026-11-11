import { submit } from '../../_awards/awards.mjs';
export async function onRequestPost({ request, env }) { return submit(request, env); }
