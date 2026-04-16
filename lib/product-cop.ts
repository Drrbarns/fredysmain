import { supabaseAdmin } from '@/lib/supabase-admin';

export type CopPayload = {
  enabled?: boolean;
  cop_description?: string | null;
  fabric_cost?: number | string | null;
  other_cost?: number | string | null;
  labour_cost?: number | string | null;
  production_staff_id?: string | null;
};

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function syncProductCostOfProduction(productId: string, cop: CopPayload | null | undefined) {
  if (!cop || cop.enabled === false) {
    await supabaseAdmin.from('product_cost_of_production').delete().eq('product_id', productId);
    return;
  }
  const fabric = num(cop.fabric_cost);
  const other = num(cop.other_cost);
  const labour = num(cop.labour_cost);
  const desc = cop.cop_description != null ? String(cop.cop_description).trim() : '';
  const hasStaff = !!cop.production_staff_id;
  if (fabric === 0 && other === 0 && labour === 0 && !hasStaff && !desc) {
    await supabaseAdmin.from('product_cost_of_production').delete().eq('product_id', productId);
    return;
  }
  const { error } = await supabaseAdmin.from('product_cost_of_production').upsert(
    {
      product_id: productId,
      cop_description: desc || null,
      fabric_cost: fabric,
      other_cost: other,
      labour_cost: labour,
      production_staff_id: cop.production_staff_id || null,
    },
    { onConflict: 'product_id' }
  );
  if (error) throw new Error(error.message);
}
