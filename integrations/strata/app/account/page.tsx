import {requireUser} from '@/lib/auth';
import {googleConfigured} from '@/lib/google-auth';
import SignOut from './sign-out';
export const dynamic='force-dynamic';
export default async function Account(){const u=await requireUser('/account');return <main className="auth-shell"><section className="auth-card"><a className="auth-brand" href="/">strata.</a><h1>Your account</h1><p>{u.displayName}</p><p>{u.email}</p>{googleConfigured()&&<form action="/api/auth/google" method="post"><input type="hidden" name="returnTo" value="/account"/><button className="auth-google">Connect Google</button></form>}<p>Your fieldbook and photos are private to this account.</p><SignOut/><a href="/">Back to the map</a></section></main>}
