import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`create-order:${clientId}`, RATE_LIMITS.payment);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const { orderData, items } = await req.json();

        if (!orderData || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
        }

        if (!orderData.email || !orderData.phone || !orderData.order_number) {
            return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
        }

        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (orderError) {
            console.error('[Create Order] Insert error:', orderError.message);
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
        }

        const orderItems = items.map((item: any) => ({
            ...item,
            order_id: order.id,
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('[Create Order] Items insert error:', itemsError.message);
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
            return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
        }

        if (orderData.email) {
            try {
                await supabaseAdmin.rpc('upsert_customer_from_order', {
                    p_email: orderData.email,
                    p_phone: orderData.phone,
                    p_full_name: `${orderData.shipping_address?.firstName || ''} ${orderData.shipping_address?.lastName || ''}`.trim(),
                    p_first_name: orderData.shipping_address?.firstName || '',
                    p_last_name: orderData.shipping_address?.lastName || '',
                    p_user_id: orderData.user_id || null,
                    p_address: orderData.shipping_address || null,
                });
            } catch (e) {
                console.warn('[Create Order] Customer upsert failed (non-blocking):', e);
            }
        }

        return NextResponse.json({
            order: {
                id: order.id,
                order_number: order.order_number,
                total: order.total,
                email: order.email,
            }
        });
    } catch (err: any) {
        console.error('[Create Order] Error:', err.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
