'use client';
import { useState, useEffect, useRef } from 'react';

const SESSION_KEY = 'dashboard_auth';

export default function PasswordGate({ code, children }: { code: string; children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput]       = useState('');
  const [error, setError]       = useState(false);
  const [checked, setChecked]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === code) setUnlocked(true);
    setChecked(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [code]);

  function submit() {
    if (input === code) {
      sessionStorage.setItem(SESSION_KEY, code);
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  if (!checked) return null;

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card p-8 w-full max-w-[320px] flex flex-col items-center gap-5 animate-fade-up">
        {/* Lock icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div className="text-center">
          <p className="text-[16px] font-semibold text-c1">Дашборд</p>
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
            className={`w-full text-center text-[22px] font-bold tracking-[0.3em] text-c1
                        bg-transparent outline-none rounded-xl px-4 py-3 transition-colors
                        ${error ? 'border-red-500' : ''}`}
            style={{ border: `2px solid ${error ? '#ef4444' : 'var(--cbrd)'}` }}
          />
          {error && (
            <p className="text-[12px] text-red-500 text-center">Невірний пароль</p>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          className="w-full py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Увійти
        </button>
      </div>
    </div>
  );
}
