'use client';
import { useState } from 'react';

export default function NotifyToggle({ empId, initial }: { empId: string; initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const next = !enabled;
    setEnabled(next);
    await fetch('/api/employees/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: empId, notify: next }),
    });
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={enabled ? 'Сповіщення увімкнено' : 'Сповіщення вимкнено'}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0
        ${enabled ? 'bg-indigo-500' : ''} ${loading ? 'opacity-50' : ''}`}
      style={!enabled ? { backgroundColor: 'var(--cbrd)' } : {}}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm
        transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}
