'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput]   = useState('');
  const [error, setError]   = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function submit() {
    if (!input || loading) return;
    setLoading(true);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: input }),
    });
    if (res.ok) {
      const from = searchParams.get('from') || '/dashboard';
      router.replace(from);
    } else {
      setError(true);
      setInput('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ backgroundColor: 'var(--cbg)' }}>
      <div className="card p-8 w-full max-w-[320px] flex flex-col items-center gap-6 animate-fade-up">

        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div className="text-center">
          <p className="text-[18px] font-semibold text-c1">Вхід</p>
          <p className="text-[12px] text-c4 mt-1">Введіть пароль для доступу</p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="••••"
            className="w-full text-center text-[24px] font-bold tracking-[0.4em] text-c1
                       bg-transparent outline-none rounded-xl px-4 py-3 transition-colors"
            style={{ border: `2px solid ${error ? '#ef4444' : 'var(--cbrd)'}` }}
          />
          {error && (
            <p className="text-[12px] text-red-500 text-center">Невірний пароль</p>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={loading || !input}
          className="w-full py-3 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          {loading ? 'Перевірка...' : 'Увійти'}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
