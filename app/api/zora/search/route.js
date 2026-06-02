// app/api/zora/search/route.js
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

function isAddress(str) {
  return /^0x[a-fA-F0-9]{40}$/i.test(str?.trim());
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

function normalizeToken(raw) {
  const mc = raw.mediaContent || {};
  const pi = mc.previewImage || {};
  const rawImageUrl = pi.medium || pi.small || pi.large || mc.originalUri || null;
  const tp = raw.tokenPrice || {};
  
  const coin = {
    address: raw.address?.toLowerCase(),
    name: raw.name || 'Unknown',
    symbol: raw.symbol || '???',
    description: raw.description || '',
    priceUSD: parseFloat(tp.usdcPerToken || 0),
    priceChange24h: parseFloat(raw.marketCapDelta24h || 0),
    marketCap: parseFloat(raw.marketCap || 0),
    volume24h: parseFloat(raw.volume24h || 0),
    uniqueHolders: parseInt(raw.uniqueHolders || 0),
    creatorAddress: raw.creatorAddress?.toLowerCase() || null,
    image: rawImageUrl ? convertIpfsToHttp(rawImageUrl) : null,
    zoraUrl: `https://zora.co/coin/base:${raw.address?.toLowerCase()}`,
  };
  
  coin.trustScore = calculateTrustScore(coin);
  return coin;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  if (!q?.trim() || q.trim().length < 2) {
    return NextResponse.json({ coins: [] });
  }
  
  const clean = q.trim();
  const isAddr = isAddress(clean);
  
  try {
    let tokens = [];
    
    if (isAddr) {
      const data = await fetchFromZora(`/coin?address=${clean.toLowerCase()}&chain=8453`);
      const raw = data?.zora20Token || data?.coin || data;
      if (raw?.address) {
        tokens = [normalizeToken(raw)];
      }
    } else {
      const [newCoins, topCoins, trendingCoins] = await Promise.all([
        fetchFromZora(`/explore?listType=NEW&count=100`),
        fetchFromZora(`/explore?listType=MOST_VALUABLE&count=100`),
        fetchFromZora(`/explore?listType=TOP_VOLUME_24H&count=100`),
      ]);
      
      const allItems = [];
      const addItems = (data) => {
        const edges = data?.exploreList?.edges || [];
        allItems.push(...edges.map(e => e.node));
      };
      
      addItems(newCoins);
      addItems(topCoins);
      addItems(trendingCoins);
      
      const lowerQ = clean.toLowerCase();
      const uniqueTokens = new Map();
      
      for (const item of allItems) {
        const addr = item.address?.toLowerCase();
        if (!addr || uniqueTokens.has(addr)) continue;
        
        if (item.name?.toLowerCase() === lowerQ || 
            item.symbol?.toLowerCase() === lowerQ ||
            item.name?.toLowerCase().includes(lowerQ) ||
            item.symbol?.toLowerCase().includes(lowerQ)) {
          uniqueTokens.set(addr, normalizeToken(item));
        }
      }
      
      tokens = Array.from(uniqueTokens.values()).slice(0, limit);
    }
    
    return NextResponse.json({ coins: tokens });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ coins: [] });
  }
}