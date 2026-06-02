// app/api/portfolio/route.js
import { NextResponse } from 'next/server';

const ZORA_API = 'https://api-sdk.zora.engineering';
const ZEROX_API = 'https://api.0x.org';

// Harga token dalam USD dari 0x API
async function getTokenPrice(address, chainId = 8453) {
  try {
    const zeroAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // ETH
    const targetAddress = address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? zeroAddress : address;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(
      `${ZEROX_API}/swap/v1/price?buyToken=${targetAddress}&sellToken=${zeroAddress}&buyAmount=1000000000000000000&chainId=${chainId}`,
      { 
        headers: { '0x-api-key': process.env.ZEROX_API_KEY || '' },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.price) || 0;
  } catch (error) {
    console.error('Price fetch error for', address, ':', error.message);
    return 0;
  }
}

// Baca ETH balance dari RPC
async function getETHBalance(address) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await res.json();
    const balanceWei = parseInt(data.result, 16);
    return balanceWei / 1e18;
  } catch (error) {
    console.error('ETH balance error:', error.message);
    return 0;
  }
}

// Baca token balance menggunakan RPC (ERC-20)
async function getTokenBalance(address, contractAddress, decimals = 18) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: `0x70a08231000000000000000000000000${address.slice(2)}`,
        }, 'latest'],
        id: 1,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await res.json();
    if (data.error) return 0;
    const balance = parseInt(data.result, 16);
    return balance / 10 ** decimals;
  } catch (error) {
    console.error('Token balance error for', contractAddress, ':', error.message);
    return 0;
  }
}

async function fetchZoraHoldings(address) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${ZORA_API}/profile/holdings?identifier=${address}&chain=8453`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) return [];
    const data = await res.json();
    const holdings = data?.profile?.holdings?.edges || [];
    return holdings.map(edge => {
      const token = edge.node?.token;
      const balanceRaw = edge.node?.balance || '0';
      const decimals = token?.decimals || 18;
      const balance = parseFloat(balanceRaw) / (10 ** decimals);
      return {
        address: token?.address,
        name: token?.name,
        symbol: token?.symbol,
        balance: balance,
        valueUSD: 0,
        logo: token?.mediaContent?.previewImage?.medium || null,
        isZoraToken: true,
      };
    });
  } catch (error) {
    console.error('Zora holdings error:', error.message);
    return [];
  }
}

// Harga fallback untuk token umum (jika API gagal)
function getFallbackPrice(symbol) {
  const fallbackPrices = {
    'ETH': 3500,
    'WETH': 3500,
    'USDC': 1,
    'USDbC': 1,
    'DAI': 1,
  };
  return fallbackPrices[symbol] || 0;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
  }

  try {
    // Token yang akan dibaca
    const tokensToRead = [
      { symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', decimals: 18, name: 'Ethereum' },
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, name: 'USD Coin' },
      { symbol: 'USDbC', address: '0xd9aaeC86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, name: 'USD Base Coin' },
      { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, name: 'Dai Stablecoin' },
      { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, name: 'Wrapped Ether' },
    ];

    // Ambil balance ETH dan token (dengan Promise.allSettled agar tidak gagal total)
    const results = await Promise.allSettled([
      getETHBalance(address),
      ...tokensToRead.slice(1).map(token => getTokenBalance(address, token.address, token.decimals)),
    ]);
    
    const ethBalance = results[0].status === 'fulfilled' ? results[0].value : 0;
    const tokenBalances = results.slice(1).map(r => r.status === 'fulfilled' ? r.value : 0);

    // Gabungkan token dengan balance
    const baseTokens = tokensToRead.map((token, idx) => ({
      ...token,
      balance: idx === 0 ? ethBalance : tokenBalances[idx - 1],
      valueUSD: 0,
      isBaseToken: true,
    })).filter(t => t.balance > 0);

    // Ambil Zora holdings
    let zoraHoldings = await fetchZoraHoldings(address);
    zoraHoldings = zoraHoldings.filter(t => t.balance > 0);

    // Gabungkan semua token
    let allTokens = [...baseTokens, ...zoraHoldings];

    // Ambil harga untuk semua token (dengan batasan concurrent)
    const prices = {};
    
    // Proses harga dengan batch (max 5 concurrent)
    const batchSize = 5;
    for (let i = 0; i < allTokens.length; i += batchSize) {
      const batch = allTokens.slice(i, i + batchSize);
      const pricePromises = batch.map(async (token) => {
        const price = await getTokenPrice(token.address);
        prices[token.address] = price > 0 ? price : getFallbackPrice(token.symbol);
      });
      await Promise.all(pricePromises);
    }

    // Hitung nilai USD
    allTokens = allTokens.map(token => ({
      ...token,
      valueUSD: token.balance * (prices[token.address] || getFallbackPrice(token.symbol)),
    }));

    // Urutkan berdasarkan nilai tertinggi
    allTokens.sort((a, b) => b.valueUSD - a.valueUSD);

    const totalValue = allTokens.reduce((sum, t) => sum + t.valueUSD, 0);

    return NextResponse.json({
      address,
      chain: 'base',
      tokens: allTokens.map(t => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        balance: t.balance.toFixed(6),
        valueUSD: t.valueUSD.toFixed(2),
        logo: t.logo,
      })),
      totalValue: totalValue.toFixed(2),
      tokenCount: allTokens.length,
    });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}