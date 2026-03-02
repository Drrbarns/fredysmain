import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getAccessToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/\bsb-access-token=([^;]+)/);
  if (match) return decodeURIComponent(match[1].trim());
  const authCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('sb-') && (c.includes('-auth-token') || c.includes('auth')));
  if (!authCookie) return null;
  const value = authCookie.split('=').slice(1).join('=').trim();
  const decoded = decodeURIComponent(value);
  try {
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    if (parsed?.access_token) return parsed.access_token;
    if (typeof parsed === 'string') return parsed;
  } catch {
    return decoded;
  }
  return null;
}

async function requireAdmin(request: Request): Promise<NextResponse | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 503 });
  }
  const token = getAccessToken(request);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = profile?.role != null ? String(profile.role) : '';
  if (role !== 'admin' && role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * DELETE /api/admin/products/[id]
 * Deletes a product and its dependent rows (images, variants, cart/wishlist, reviews).
 * Fails with 400 if the product has order history.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id: productId } = await params;
  if (!productId) {
    return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
  }

  try {
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('product_id', productId)
      .limit(1);
    if (orderItems && orderItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product that has been ordered. Consider archiving it instead.' },
        { status: 400 }
      );
    }

    await supabaseAdmin.from('cart_items').delete().eq('product_id', productId);
    await supabaseAdmin.from('wishlist_items').delete().eq('product_id', productId);

    const { data: reviews } = await supabaseAdmin.from('reviews').select('id').eq('product_id', productId);
    if (reviews?.length) {
      const reviewIds = reviews.map((r) => r.id);
      await supabaseAdmin.from('review_images').delete().in('review_id', reviewIds);
      await supabaseAdmin.from('reviews').delete().eq('product_id', productId);
    }

    await supabaseAdmin.from('product_images').delete().eq('product_id', productId);
    await supabaseAdmin.from('product_variants').delete().eq('product_id', productId);

    const { error } = await supabaseAdmin.from('products').delete().eq('id', productId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete product' }, { status: 500 });
  }
}
