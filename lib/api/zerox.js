// lib/api/zerox.js
const ZEROX_API_KEY = process.env.ZEROX_API_KEY;
const BASE_URL = 'https://api.0x.org';
const CHAIN_ID = 8453;
const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const WETH = '0x4200000000000000000000000000000000000006';

// HARDCODE FEE RECIPIENT (wallet publik)
const FEE_RECIPIENT = '0x462be091Ef7Cfae820bb032a3cf2729fcAaD6e47';
const FEE_BPS = 30; // 0.3% = 30 basis points

const TOKEN_DECIMALS = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 6,
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 18,
  '0x4200000000000000000000000000000000000006': 18,
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 18,
};

export function getDecimals(address) {
  return TOKEN_DECIMALS[address?.toLowerCase()] ?? 18;
}

function headers() {
  return {
    '0x-api-key': ZEROX_API_KEY || '',
    '0x-version': 'v2',
    '0x-chain-id': String(CHAIN_ID),
    'Accept': 'application/json',
  };
}

async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('0x API timeout');
    throw err;
  }
}

export async function getPrice({ tokenIn, tokenOut, amount, slippage = 0.5, taker }) {
  if (!ZEROX_API_KEY) return null;
  
  const inDec = getDecimals(tokenIn);
  const sellAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, inDec))).toString();
  const slippageBps = Math.round(slippage * 100);

  const params = new URLSearchParams({
    chainId: String(CHAIN_ID),
    sellToken: tokenIn === 'ETH' ? NATIVE_ETH : tokenIn,
    buyToken: tokenOut,
    sellAmount,
    slippageBps: String(slippageBps),
  });
  
  if (taker) params.set('taker', taker);
  
  // Affiliate fee (hardcode)
  params.set('swapFeeRecipient', FEE_RECIPIENT);
  params.set('swapFeeBps', String(FEE_BPS));
  params.set('swapFeeToken', tokenOut);

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/swap/allowance-holder/price?${params}`, { headers: headers() }, 12000);
    if (!res.ok) return null;
    
    const data = await res.json();
    const outDec = getDecimals(tokenOut);
    
    return {
      success: true,
      buyAmount: parseFloat(data.buyAmount || '0') / Math.pow(10, outDec),
      buyAmountRaw: data.buyAmount,
      sellAmount: parseFloat(amount),
      outDec,
      price: data.price ? parseFloat(data.price) : null,
      estimatedGas: data.estimatedGas,
      fees: data.fees,
      allowanceTarget: data.issues?.allowance?.spender || null,
      raw: data,
    };
  } catch (err) {
    console.error('0x price error:', err.message);
    return null;
  }
}

export async function getQuote({ tokenIn, tokenOut, amount, slippage = 0.5, taker }) {
  if (!ZEROX_API_KEY || !taker) return null;
  
  const inDec = getDecimals(tokenIn);
  const sellAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, inDec))).toString();
  const slippageBps = Math.round(slippage * 100);

  const params = new URLSearchParams({
    chainId: String(CHAIN_ID),
    sellToken: tokenIn === 'ETH' ? NATIVE_ETH : tokenIn,
    buyToken: tokenOut,
    sellAmount,
    taker,
    slippageBps: String(slippageBps),
  });
  
  // Affiliate fee (hardcode)
  params.set('swapFeeRecipient', FEE_RECIPIENT);
  params.set('swapFeeBps', String(FEE_BPS));
  params.set('swapFeeToken', tokenOut);

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/swap/allowance-holder/quote?${params}`, { headers: headers() }, 15000);
    if (!res.ok) return null;
    
    const data = await res.json();
    const outDec = getDecimals(tokenOut);
    
    return {
      success: true,
      buyAmount: parseFloat(data.buyAmount || '0') / Math.pow(10, outDec),
      buyAmountRaw: data.buyAmount,
      outDec,
      transaction: data.transaction,
      allowanceTarget: data.issues?.allowance?.spender || null,
      approval: data.approval || null,
      estimatedGas: data.estimatedGas,
      fees: data.fees,
      raw: data,
    };
  } catch (err) {
    console.error('0x quote error:', err.message);
    return null;
  }
}

export { NATIVE_ETH, WETH, CHAIN_ID, FEE_RECIPIENT, FEE_BPS };