import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Storage is unavailable');return env.DB}
export function safeOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin}
export function randomUrlSafe(bytes=32){const data=crypto.getRandomValues(new Uint8Array(bytes));return btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export async function digest(value:string){const data=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
