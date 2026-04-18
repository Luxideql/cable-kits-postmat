// Всі операції з даними йдуть через Google Apps Script (GAS) як middleware.
// GAS зберігає дані прямо в Google Sheets — service account не потрібен.

const GAS_URL = process.env.GAS_URL!;

if (!GAS_URL) {
  console.warn('⚠️  GAS_URL не задано в .env.local');
}

export async function gasGet<T = unknown>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`GAS GET ${action} failed: ${res.status}`);
  const data = await res.json() as { success: boolean; error?: string } & T;
  if (!data.success) throw new Error(data.error ?? `GAS error on ${action}`);
  return data as T;
}

export async function gasPost<T = unknown>(
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`GAS POST ${action} failed: ${res.status}`);
  const data = await res.json() as { success: boolean; error?: string } & T;
  if (!data.success) throw new Error(data.error ?? `GAS error on ${action}`);
  return data as T;
}
