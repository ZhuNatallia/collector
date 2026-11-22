'use client';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function InteriorAiAccess({ signedIn }: { signedIn: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setPending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + window.location.pathname },
      });
      setStatus(error ? 'Не удалось отправить ссылку для входа.' : 'Откройте ссылку из письма, чтобы войти.');
    } catch {
      setStatus('Не удалось отправить ссылку для входа.');
    } finally {
      setPending(false);
    }
  }

  if (signedIn) return null;
  return <form className="canvas-controls" onSubmit={signIn}>
    <input type="email" aria-label="Почта Supabase" placeholder="Почта для входа" required
      value={email} onChange={event => setEmail(event.target.value)}/>
    <button type="submit" className="button" disabled={pending}>Войти для AI-анализа</button>
    {status && <span role="status">{status}</span>}
  </form>;
}
