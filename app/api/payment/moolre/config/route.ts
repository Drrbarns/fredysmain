import { NextResponse } from 'next/server';

export async function GET() {
  const missing: string[] = [];
  if (!process.env.MOOLRE_API_USER) missing.push('MOOLRE_API_USER');
  if (!process.env.MOOLRE_API_PUBKEY) missing.push('MOOLRE_API_PUBKEY');
  if (!process.env.MOOLRE_ACCOUNT_NUMBER) missing.push('MOOLRE_ACCOUNT_NUMBER');

  return NextResponse.json({
    enabled: missing.length === 0,
    missing,
  });
}

