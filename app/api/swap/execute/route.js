// app/api/swap/execute/route.js
import { NextResponse } from 'next/server';
import { getQuote, NATIVE_ETH, FEE_RECIPIENT, FEE_BPS } from '@/lib/api/zerox';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

const FEE_PERCENT = FEE_BPS / 100; // 0.3%

function serialize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(obj)) r[k] = serialize(v);
    return r;
  }
  return obj;
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { tokenIn, tokenOut, amount, slippage, userAddress } = body;

  if (!tokenIn || !tokenOut || !amount || !userAddress) {
    return NextResponse.json({ error: 'tokenIn, tokenOut, amount, userAddress required' }, { status: 400, headers: CORS });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: CORS });
  }

  const feeAmount = amountNum * (FEE_PERCENT / 100);
  const amountAfterFee = amountNum - feeAmount;
  const slippagePct = parseFloat(slippage) || 0.5;

  console.log(`ZoraMint swap: ${amountAfterFee} ${tokenIn} → ${tokenOut} | user: ${userAddress} | fee: ${feeAmount} ${tokenIn}`);

  try {
    const quote = await getQuote({
      tokenIn,
      tokenOut,
      amount: amountAfterFee,
      slippage: slippagePct,
      taker: userAddress,
    });

    if (!quote?.success || !quote.transaction) {
      return NextResponse.json({ error: '0x failed to return transaction data.' }, { status: 500, headers: CORS });
    }

    return NextResponse.json(serialize({
      success: true,
      transaction: quote.transaction,
      approval: quote.approval || null,
      allowanceTarget: quote.allowanceTarget,
      buyAmount: quote.buyAmount,
      buyAmountRaw: quote.buyAmountRaw,
      feeAmount,
      feePercent: FEE_PERCENT,
      feeRecipient: FEE_RECIPIENT,
      source: '0x',
    }), { headers: CORS });
  } catch (e) {
    console.error('Execute error:', e);
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS });
  }
}