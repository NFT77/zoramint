// app/api/swap/quote/route.js
import { NextResponse } from 'next/server';
import { getPrice, NATIVE_ETH } from '@/lib/api/zerox';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
};
export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

const cache = new Map();
const TTL = 5000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tokenIn = searchParams.get('tokenIn');
  const tokenOut = searchParams.get('tokenOut');
  const amount = searchParams.get('amount');
  const slippage = parseFloat(searchParams.get('slippage') || '0.5');
  const taker = searchParams.get('taker') || undefined;

  if (!tokenIn || !tokenOut || !amount) {
    return NextResponse.json({ error: 'tokenIn, tokenOut, amount required' }, { status: 400, headers: CORS });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: CORS });
  }

  const cacheKey = `${tokenIn}:${tokenOut}:${amount}:${slippage}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ ...cached.data, cached: true }, { headers: CORS });
  }

  try {
    const quote = await getPrice({ tokenIn, tokenOut, amount: amountNum, slippage, taker });

    if (!quote?.success) {
      return NextResponse.json({ error: '0x failed to return a quote. Please try again.' }, { status: 500, headers: CORS });
    }

    const response = {
      success: true,
      amountOut: quote.buyAmount,
      amountOutRaw: quote.buyAmountRaw,
      outDecimals: quote.outDec,
      estimatedGas: quote.estimatedGas,
      fees: quote.fees,
      allowanceTarget: quote.allowanceTarget,
      source: '0x',
      timestamp: Date.now(),
    };

    if (cache.size > 100) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { data: response, ts: Date.now() });
    return NextResponse.json(response, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS });
  }
}