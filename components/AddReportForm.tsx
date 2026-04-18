'use client';
import { useState } from 'react';
import type { Employee, Position } from '@/lib/types';

interface Props {
  employees: Employee[];
  positions: Position[];
  onSuccess?: () => void;
}

export default function AddReportForm({ employees, positions, onSuccess }: Props) {
  const [empId, setEmpId]     = useState('');
  const [posId, setPosId]     = useState('');
  const [qty, setQty]         = useState('');
  const [hours, setHours]     = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!empId || !posId || !qty) { setMsg('❌ Заповніть обов\'язкові поля'); return; }
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId, positionId: posId, qty: Number(qty), hours: Number(hours || 0), comment }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg('✅ Виробіток записано!');
        setQty(''); setHours(''); setComment('');
        onSuccess?.();
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-700">➕ Додати виробіток</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Працівник *</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— оберіть —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Позиція *</label>
          <select value={posId} onChange={e => setPosId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— оберіть —</option>
            {positions.map(p => (
              <option key={p.id} value={p.id}>{p.lengthMm} мм ({p.qtyPerPostomat} шт/компл.)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Кількість (шт) *</label>
          <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Години</label>
          <input type="number" min={0} step={0.5} value={hours} onChange={e => setHours(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Коментар</label>
        <input type="text" value={comment} onChange={e => setComment(e.target.value)}
          placeholder="необов'язково"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Збереження...' : 'Зберегти'}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </form>
  );
}
