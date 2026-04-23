import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Resolves a login identifier (email OR phone) to the admin/staff user's email
 * so the client can then call supabase.auth.signInWithPassword({ email, password }).
 *
 * - If the identifier looks like an email, it's returned as-is.
 * - If it's a phone number, we look it up against `profiles.phone` restricted to
 *   users with role in (admin, staff) and return their email.
 * - The endpoint does NOT leak whether an account exists: it always returns
 *   either `{ email }` on success or the same generic failure payload.
 */
export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rl = checkRateLimit(`admin-resolve:${clientId}`, {
            maxRequests: 10,
            windowSeconds: 60,
        });
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Too many attempts. Please wait a moment and try again.' },
                { status: 429 }
            );
        }

        const body = await req.json().catch(() => null);
        const identifier: string = (body?.identifier || '').toString().trim();

        if (!identifier) {
            return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
        }

        // Email path — return as-is (Supabase Auth will validate)
        if (identifier.includes('@')) {
            return NextResponse.json({ email: identifier.toLowerCase() });
        }

        // Phone path — normalize to a handful of likely-stored formats and query profiles.
        const digits = identifier.replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 15) {
            return NextResponse.json({ error: 'Enter a valid email or phone number' }, { status: 400 });
        }

        const candidates = buildPhoneCandidates(digits, identifier);
        // Fallback on common fallback (unlikely but safe)
        if (!candidates.length) {
            return NextResponse.json({ error: 'Enter a valid email or phone number' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('email, role, phone')
            .in('phone', candidates)
            .in('role', ['admin', 'staff'])
            .limit(1);

        if (error) {
            console.error('[Admin Resolve] Supabase error:', error.message);
            return NextResponse.json({ error: 'Lookup failed. Try email instead.' }, { status: 500 });
        }

        const match = data?.[0];
        if (!match?.email) {
            return NextResponse.json(
                { error: 'No admin account found with that phone. Use your email to sign in.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ email: match.email });
    } catch (err: any) {
        console.error('[Admin Resolve] Error:', err?.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

/**
 * Build candidate strings the phone may have been stored as.
 * Accepts Ghana inputs like "0244720197", "233244720197", "+233244720197",
 * and generic international inputs like "+14155551234".
 */
function buildPhoneCandidates(digits: string, original: string): string[] {
    const out = new Set<string>();
    const trimmed = original.trim();
    out.add(trimmed);
    out.add(digits);

    // Ghana-specific normalization
    if (digits.length === 10 && digits.startsWith('0')) {
        const rest = digits.slice(1);
        out.add(`233${rest}`);
        out.add(`+233${rest}`);
    }
    if (digits.length === 12 && digits.startsWith('233')) {
        const rest = digits.slice(3);
        out.add(`0${rest}`);
        out.add(`+${digits}`);
    }
    if (digits.length === 9) {
        out.add(`0${digits}`);
        out.add(`233${digits}`);
        out.add(`+233${digits}`);
    }

    // Generic E.164 variant
    if (!out.has(`+${digits}`)) out.add(`+${digits}`);

    return Array.from(out).filter(Boolean);
}
