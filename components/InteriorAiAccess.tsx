'use client';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function InteriorAiAccess({ signedIn }: { signedIn: boolean }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      });
      if (error?.code === 'invalid_credentials') {
        setStatus('Проверьте email и пароль тестового пользователя.');
      } else if (error?.code === 'email_not_confirmed') {
        setStatus('Email пользователя ещё не подтверждён в Supabase.');
      } else if (error?.status === 429) {
        setStatus('Слишком много попыток входа. Попробуйте позже.');
      } else if (error) {
        setStatus('Не удалось войти. Попробуйте ещё раз.');
      }
    } catch {
      setStatus('Не удалось подключиться к Supabase.');
    } finally {
      setPending(false);
    }
  }

  if (signedIn) return <p className="subtle" role="status">Вход выполнен</p>;
  return <form className="canvas-controls" onSubmit={signIn} style={{ flexWrap: 'wrap', gap: 8 }}>
    <input name="email" type="email" aria-label="Email" placeholder="Email" autoComplete="username" required/>
    <input name="password" type="password" aria-label="Пароль" placeholder="Пароль" autoComplete="current-password" required/>
    <button type="submit" className="button" disabled={pending}>
      {pending ? 'Входим…' : 'Войти для AI-анализа'}
    </button>
    {status && <span role="alert">{status}</span>}
  </form>;
}
