import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`order-lookup:${clientId}`, RATE_LIMITS.payment);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const { orderId, includeItems } = await req.json();
        if (!orderId || typeof orderId !== 'string') {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        const selectFields = includeItems
            ? 'id, order_number, email, phone, total, subtotal, shipping_total, discount_total, status, payment_status, shipping_address, metadata, created_at, order_items(*)'
            : 'id, order_number, email, total, subtotal, shipping_total, discount_total, status, payment_status, shipping_address, metadata, created_at';

        const query = supabaseAdmin.from('orders').select(selectFields);

        const { data: order, error } = isUUID
            ? await query.eq('id', orderId).single()
            : await query.eq('order_number', orderId).single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json({ order });
    } catch (err: any) {
        console.error('[Order Lookup] Error:', err.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
