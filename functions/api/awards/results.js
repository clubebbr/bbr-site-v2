import { results } from '../../_awards/awards.mjs';
export async function onRequestGet({ request, env }) { return results(request, env); }
