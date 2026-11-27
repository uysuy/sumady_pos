import type { Reroute, Transport } from '@sveltejs/kit';
import { deLocalizeUrl } from './paraglide/runtime';

export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;

/** Required when `hooks.ts` exists — the client bundle always imports `transport`. */
export const transport: Transport = {};
