'use client';
import { useState } from 'react';

const googleErrors: Record<string, string> = {
  google_unavailable: 'Google sign-in is not available yet. Please use email.',
  google_state: 'Your Google sign-in expired. Please try again.',
  google_cancelled: 'Google sign-in was cancelled. You can try again or use email.',
  google_failed: 'Unable to complete Google sign-in. Please try again.',
  google_existing: 'This email already has an account. Sign in with your password, then connect Google from your account page.',
  google_link: 'Unable to connect this Google account. Sign in to your original account and try again.',
};

export default function AuthForm({ mode, returnTo, googleEnabled, initialError }: {
  mode: 'login' | 'register'; returnTo: string; googleEnabled: boolean; initialError?: string;
}) {
  const [error, setError] = useState(googleErrors[initialError || ''] || ''), [busy, setBusy] = useState(false);
  const register = mode === 'register';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), returnTo }) });
      const data = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok) throw Error(data.error || 'Please try again.');
      window.location.assign(data.returnTo || '/');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to connect.'); setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card">
    <a className="auth-brand" href="/"><b>strata.</b><small>FIELD ATLAS</small></a>
    <h1>{register ? 'Create your account' : 'Welcome back'}</h1>
    <p>Keep your field notes, locations and specimens together across devices.</p>
    {googleEnabled && <><form action="/api/auth/google" method="post"><input type="hidden" name="returnTo" value={returnTo}/>
      <button className="auth-google" type="submit">Continue with Google</button></form><div className="auth-divider">or continue with email</div></>}
    <form onSubmit={submit}>
      {register && <label>Name<input name="name" autoComplete="name" required minLength={2} maxLength={80}/></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 10 : undefined} maxLength={200}/>
        {register && <small>Use at least 10 characters.</small>}</label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    <p>{register ? 'Already have an account?' : 'Need an account?'} <a href={`${register ? '/login' : '/register'}?returnTo=${encodeURIComponent(returnTo)}`}>{register ? 'Sign in' : 'Create account'}</a></p>
    <a href={returnTo}>Continue exploring the map</a>
    <p><a href="/privacy">Privacy</a></p>
  </section></main>;
}
