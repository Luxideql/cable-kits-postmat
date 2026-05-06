import { getMaterials, getKitStats } from '@/lib/data';
import MaterialsClient from '@/components/MaterialsClient';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const [materials, kitStats] = await Promise.all([getMaterials(), getKitStats()]);
  return <MaterialsClient initialMaterials={materials} kitsProduced={kitStats.totalKits} />;
}
