import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || '';
  const symbol = searchParams.get('symbol') || 'Creator Coin';

  const shareUrl = `https://zoramint.vercel.app?coin=${address}`;
  const castText = `Check out $${symbol} on ZoraMint 🟣\n\nSwap Zora creator coins on Base → ${shareUrl}`;

  return NextResponse.json({ shareUrl, castText, address, symbol });
}
