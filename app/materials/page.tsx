import { getMaterials, getKitStats } from '@/lib/data';
import MaterialsClient from '@/components/MaterialsClient';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  let materials: Awaited<ReturnType<typeof getMaterials>> = [];
  let kitsProduced = 0;
  let error = '';

  try {
    const [mats, kitStats] = await Promise.all([getMaterials(), getKitStats()]);
    materials = mats;
    kitsProduced = kitStats.totalKits;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400 mb-1">Помилка підключення</p>
      <p className="text-[12px] text-red-500/60 font-mono break-all">{error}</p>
    </div>
  );

  return <MaterialsClient initialMaterials={materials} kitsProduced={kitsProduced} />;
}
