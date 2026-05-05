'use client';
import { useState } from 'react';

export default function BotReportToggle({ empId, initial }: { empId: string; initial: boolean }) {
  const [allowed, setAllowed] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const next = !allowed;
    setAllowed(next);
    await fetch('/api/employees/bot-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: empId, botReport: next }),
    });
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={allowed ? 'Звіт через бот дозволено' : 'Звіт через бот заблоковано'}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0
        ${loading ? 'opacity-50' : ''}`}
      style={{ backgroundColor: allowed ? '#059669' : 'var(--cbrd)' }}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm
        transition-transform duration-200 ${allowed ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}
