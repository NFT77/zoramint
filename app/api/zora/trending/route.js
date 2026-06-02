// app/api/zora/trending/route.js
import { NextResponse } from 'next/server';

const ZORA_API = 'https://api-sdk.zora.engineering';

async function fetchFromZora(path) {
  const res = await fetch(`${ZORA_API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Zora API ${res.status}`);
  return res.json();
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

function normalizeCoin(raw) {
  if (!raw) return null;
  const address = raw.address?.toLowerCase();
  if (!address) return null;
  
  const mc = raw.mediaContent || {};
  const pi = mc.previewImage || {};
  const rawImageUrl = pi.medium || pi.small || pi.large || mc.originalUri || null;
  const image = rawImageUrl ? convertIpfsToHttp(rawImageUrl) : null;
  const tp = raw.tokenPrice || {};
  const priceUSD = parseFloat(tp.usdcPerToken || 0);
  
  const coin = {
    address,
    name: raw.name || 'Unknown',
    symbol: raw.symbol || '???',
    description: raw.description || '',
    priceUSD,
    priceChange24h: parseFloat(raw.marketCapDelta24h || 0),
    marketCap: parseFloat(raw.marketCap || 0),
    volume24h: parseFloat(raw.volume24h || 0),
    uniqueHolders: parseInt(raw.uniqueHolders || 0),
    creatorAddress: raw.creatorAddress?.toLowerCase() || null,
    image,
    zoraUrl: `https://zora.co/coin/base:${address}`,
  };
  
  coin.trustScore = calculateTrustScore(coin);
  return coin;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'trending';
  const limit = parseInt(searchParams.get('limit') || '20');
  
  try {
    let listType = 'TOP_VOLUME_24H';
    if (tab === 'new') listType = 'NEW';
    else if (tab === 'gainers') listType = 'TOP_GAINERS';
    
    const data = await fetchFromZora(`/explore?listType=${listType}&count=${limit}`);
    const edges = data?.exploreList?.edges || [];
    let coins = edges.map(edge => normalizeCoin(edge.node)).filter(Boolean);
    
    if (tab === 'gainers') {
      coins.sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0));
    }
    
    return NextResponse.json({ coins, tab });
  } catch (error) {
    console.error('Trending API error:', error.message);
    return NextResponse.json({ coins: [] });
  }
}