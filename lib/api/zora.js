// lib/api/zora.js
import {
  searchFarcasterUsers,
  getUserByUsername,
  getUserByAddress,
  convertIpfsToHttp,
} from '@/lib/api/farcaster';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const ZORA_API_KEY = process.env.ZORA_API_KEY; // Tambahkan API Key Zora
const ZORA_API = 'https://api-sdk.zora.engineering';
const CHAIN_ID = 8453;

function isAddress(str) {
  return /^0x[a-fA-F0-9]{40}$/i.test(str?.trim());
}

function isUsernameQuery(str) {
  return typeof str === 'string' && str.trim().startsWith('@');
}

// ============================================================
// TRUST SCORE CALCULATION
// ============================================================
function calculateTrustScore(coin) {
  if (!coin) return 50;
  
  let score = 50;
  
  // Factor 1: Unique holders (social proof / distribution)
  const holders = coin.uniqueHolders || 0;
  if (holders > 10000) score += 30;
  else if (holders > 5000) score += 25;
  else if (holders > 1000) score += 20;
  else if (holders > 500) score += 15;
  else if (holders > 100) score += 10;
  else if (holders > 50) score += 5;
  else if (holders < 10) score -= 10;
  
  // Factor 2: Market cap credibility
  const marketCap = coin.marketCap || 0;
  if (marketCap > 1000000) score += 10;
  else if (marketCap > 500000) score += 7;
  else if (marketCap > 100000) score += 5;
  else if (marketCap > 50000) score += 3;
  
  // Factor 3: Volume 24h (activity)
  const volume = coin.volume24h || 0;
  if (volume > 100000) score += 10;
  else if (volume > 50000) score += 7;
  else if (volume > 10000) score += 5;
  else if (volume > 1000) score += 3;
  else if (volume === 0) score -= 5;
  
  // Factor 4: Price change stability (jangan terlalu volatile)
  const change = Math.abs(coin.priceChange24h || 0);
  if (change > 100) score -= 15;
  else if (change > 50) score -= 10;
  else if (change > 30) score -= 5;
  
  // Factor 5: Creator verified (Farcaster profile)
  if (coin.farcasterProfile || coin.zoraCreatorProfile) score += 10;
  
  // Factor 6: Ada creator address
  if (coin.creatorAddress) score += 5;
  
  // Batasi range 0-100
  return Math.min(100, Math.max(0, score));
}

// Tambahkan API Key header untuk Zora API (rekomendasi dari dokumentasi)
async function zoraFetch(path) {
  const headers = { 'Content-Type': 'application/json' };
  if (ZORA_API_KEY) headers['api-key'] = ZORA_API_KEY;
  
  const res = await fetch(`${ZORA_API}${path}`, { headers });
  if (!res.ok) throw new Error(`Zora API ${res.status}`);
  return res.json();
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

async function getZoraCreatorProfile(handle) {
  try {
    const clean = handle.replace(/^@/, '').toLowerCase();
    const data = await zoraFetch(`/profile?identifier=${clean}`);
    const p = data?.profile;
    if (!p) return null;
    
    return {
      username: p.handle,
      displayName: p.displayName || p.handle,
      bio: p.bio || '',
      pfp_url: convertIpfsToHttp(p.avatar?.medium || p.avatar?.small),
      followerCount: p.socialAccounts?.farcaster?.followerCount || 0,
      farcasterUsername: p.socialAccounts?.farcaster?.username,
      zoraProfileUrl: `https://zora.co/${p.handle}`,
      source: 'zora',
    };
  } catch (err) {
    return null;
  }
}

export async function getZoraCoin(address) {
  if (!isAddress(address)) return null;
  try {
    const data = await zoraFetch(`/coin?address=${address.toLowerCase()}&chain=${CHAIN_ID}`);
    const raw = data?.zora20Token || data?.coin || data;
    return raw?.address ? normalizeCoin(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function searchZoraCoins(query, limit = 20) {
  if (!query?.trim() || query.trim().length < 2) return [];
  const clean = query.trim();
  
  if (isAddress(clean)) {
    const coin = await getZoraCoin(clean);
    return coin ? [coin] : [];
  }
  
  try {
    const [newCoins, topCoins, trendingCoins] = await Promise.all([
      zoraFetch('/explore?listType=NEW&count=100'),
      zoraFetch('/explore?listType=MOST_VALUABLE&count=100'),
      zoraFetch('/explore?listType=TOP_VOLUME_24H&count=100'),
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
      if (item.name?.toLowerCase().includes(lowerQ) || 
          item.symbol?.toLowerCase().includes(lowerQ)) {
        uniqueTokens.set(addr, normalizeCoin(item));
      }
    }
    
    return Array.from(uniqueTokens.values()).slice(0, limit);
  } catch (e) {
    return [];
  }
}

export async function getTrendingZoraCoins(limit = 20) {
  try {
    const data = await zoraFetch(`/explore?listType=TOP_VOLUME_24H&count=${limit}`);
    const edges = data?.exploreList?.edges || [];
    return edges.map(e => normalizeCoin(e.node)).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export async function getNewZoraCoins(limit = 20) {
  try {
    const data = await zoraFetch(`/explore?listType=NEW&count=${limit}`);
    const edges = data?.exploreList?.edges || [];
    return edges.map(e => normalizeCoin(e.node)).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export async function getTopGainersZoraCoins(limit = 20) {
  try {
    const data = await zoraFetch(`/explore?listType=TOP_GAINERS&count=${limit}`);
    const edges = data?.exploreList?.edges || [];
    const coins = edges.map(e => normalizeCoin(e.node)).filter(Boolean);
    coins.sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0));
    return coins;
  } catch (e) {
    return [];
  }
}

export async function getFeaturedCoins() {
  const addresses = [
    '0xf6e010c1e479692d3658ccfdebabf211b303315e',
    '0x99919a59c5a38887469fb0863f786880abb90dfb',
  ];
  const coins = await Promise.all(addresses.map(addr => getZoraCoin(addr)));
  return coins.filter(Boolean);
}

export async function enrichCoin(coin) {
  if (!coin) return null;
  if (coin.farcasterProfile) return coin;
  if (!NEYNAR_API_KEY) return coin;

  try {
    if (coin.creatorAddress) {
      const fcProfile = await getUserByAddress(coin.creatorAddress);
      if (fcProfile) {
        const enriched = { ...coin, farcasterProfile: fcProfile };
        enriched.trustScore = calculateTrustScore(enriched);
        return enriched;
      }
    }
  } catch (e) {}
  return coin;
}

export async function getEnrichedCoin(address) {
  const coin = await getZoraCoin(address);
  return coin ? enrichCoin(coin) : null;
}

export async function unifiedSearch(query, limit = 20) {
  if (!query?.trim() || query.trim().length < 2) {
    return { tokens: [], creators: [], query };
  }

  const clean = query.trim();
  const isAddr = isAddress(clean);
  const isUser = clean.startsWith('@');
  const searchTerm = clean.replace(/^@/, '').toLowerCase();

  try {
    if (isAddr) {
      const [token, fcUser] = await Promise.all([
        getZoraCoin(clean),
        NEYNAR_API_KEY ? getUserByAddress(clean) : null,
      ]);
      
      const tokens = token ? [await enrichCoin(token)] : [];
      const creators = fcUser ? [{ ...fcUser, coins: [] }] : [];
      return { tokens, creators, query: clean };
    }

    if (isUser || searchTerm.length > 0) {
      const [farcasterUser, zoraCreator, zoraCoins] = await Promise.all([
        NEYNAR_API_KEY ? getUserByUsername(searchTerm) : null,
        getZoraCreatorProfile(searchTerm),
        searchZoraCoins(searchTerm, 5),
      ]);
      
      const creators = [];
      
      if (farcasterUser) {
        creators.push({
          ...farcasterUser,
          source: 'farcaster',
          zoraProfile: zoraCreator,
          coins: zoraCoins,
        });
      } else if (zoraCreator) {
        creators.push({
          ...zoraCreator,
          source: 'zora',
          coins: zoraCoins,
        });
      }
      
      return { tokens: zoraCoins, creators, query: clean };
    }

    const tokens = await searchZoraCoins(clean, limit);
    const fcUsers = NEYNAR_API_KEY ? await searchFarcasterUsers(clean, 3) : [];
    const creators = fcUsers.map(creator => ({ ...creator, coins: [] }));
    
    return { tokens, creators, query: clean };
    
  } catch (error) {
    console.error('unifiedSearch error:', error);
    return { tokens: [], creators: [], query: clean };
  }
}

export { searchFarcasterUsers, getUserByUsername, getUserByAddress, convertIpfsToHttp };