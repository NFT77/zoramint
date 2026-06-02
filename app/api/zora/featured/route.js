// app/api/zora/featured/route.js
import { NextResponse } from 'next/server';

const ZORA_API = 'https://api-sdk.zora.engineering';
const FEATURED_ADDRESSES = [
  '0xf6e010c1e479692d3658ccfdebabf211b303315e',
  '0x99919a59c5a38887469fb0863f786880abb90dfb',
];

async function fetchCoinFromZora(address) {
  const res = await fetch(`${ZORA_API}/coin?address=${address}&chain=8453`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.zora20Token || data?.coin || data;
}

function convertIpfsToHttp(url) {
  if (!url) return null;
  if (url.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  return url;
}

function calculateTrustScore(coin) {
  let score = 50;
  const holders = coin.uniqueHolders || 0;
  const volume = coin.volume24h || 0;
  const marketCap = coin.marketCap || 0;
  
  if (holders > 10000) score += 30;
  else if (holders > 1000) score += 20;
  else if (holders > 100) score += 10;
  
  if (volume > 100000) score += 10;
  else if (volume > 10000) score += 5;
  
  if (marketCap > 1000000) score += 10;
  else if (marketCap > 100000) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

function normalizeCoin(raw, address) {
  if (!raw) return null;
  
  const mc = raw.mediaContent || {};
  const pi = mc.previewImage || {};
  const rawImageUrl = pi.medium || pi.small || pi.large || mc.originalUri || null;
  const image = rawImageUrl ? convertIpfsToHttp(rawImageUrl) : null;
  const tp = raw.tokenPrice || {};
  const priceUSD = parseFloat(tp.usdcPerToken || 0);
  const volume24h = parseFloat(raw.volume24h || 0);
  const marketCap = parseFloat(raw.marketCap || 0);
  const holders = parseInt(raw.uniqueHolders || 0);
  const priceChange24h = parseFloat(raw.marketCapDelta24h || 0);
  
  const coin = {
    address: address.toLowerCase(),
    name: raw.name || 'Unknown',
    symbol: raw.symbol || '???',
    description: raw.description || '',
    priceUSD,
    priceChange24h,
    marketCap,
    volume24h,
    uniqueHolders: holders,
    creatorAddress: raw.creatorAddress?.toLowerCase() || null,
    image,
    zoraUrl: `https://zora.co/coin/base:${address.toLowerCase()}`,
  };
  
  coin.trustScore = calculateTrustScore(coin);
  return coin;
}

export async function GET() {
  try {
    const coins = await Promise.all(
      FEATURED_ADDRESSES.map(async (address) => {
        try {
          const raw = await fetchCoinFromZora(address);
          return normalizeCoin(raw, address);
        } catch (err) {
          console.error(`Failed to fetch ${address}:`, err.message);
          return null;
        }
      })
    );
    
    const featuredCoins = coins.filter(Boolean);
    return NextResponse.json({ featured: featuredCoins });
  } catch (error) {
    console.error('Featured API error:', error);
    return NextResponse.json({ featured: [] }, { status: 500 });
  }
}