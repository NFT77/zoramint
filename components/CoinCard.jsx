'use client';

import { useState } from 'react';
import TrustScore from './TrustScore';

function formatPrice(p) {
  const num = parseFloat(p || 0);
  if (num === 0) return '$0';
  if (num < 0.000001) return `$${num.toExponential(2)}`;
  if (num < 0.0001) return `$${num.toFixed(7)}`;
  if (num < 0.01) return `$${num.toFixed(6)}`;
  if (num < 1) return `$${num.toFixed(4)}`;
  if (num < 100) return `$${num.toFixed(2)}`;
  return `$${num.toLocaleString()}`;
}

function formatMarketCap(n) {
  const num = parseFloat(n || 0);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function convertIpfsToHttp(url) {
  if (!url) return null;
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  }
  if (url.startsWith('/ipfs/')) {
    return `https://ipfs.io/ipfs/${url.replace('/ipfs/', '')}`;
  }
  return url;
}

function getPlaceholderColor(str) {
  if (!str) return '#7B3FE4';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

// Compact Card (Trending, New, Gainers, Search) - DENGAN CREATOR ADDRESS
export function CompactCoinCard({ coin, onSwap }) {
  const [imgError, setImgError] = useState(false);
  
  if (!coin) return null;
  
  const name = coin.name || 'Unknown Coin';
  const symbol = coin.symbol || '???';
  const price = coin.priceUSD || 0;
  const change = coin.priceChange24h || 0;
  const isPositive = change >= 0;
  let imageUrl = coin.image;
  const trustScore = coin.trustScore ?? 50;
  const creatorAddress = coin.creatorAddress || '';
  
  if (imageUrl) {
    imageUrl = convertIpfsToHttp(imageUrl);
  }
  
  return (
    <div 
      onClick={() => onSwap?.(coin)}
      className="group flex flex-col p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01]"
      style={{ 
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Baris 1: Icon, Info, Price, TrustScore */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div 
            className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden shadow-lg" 
            style={{ background: getPlaceholderColor(symbol) }}
          >
            {imageUrl && !imgError ? (
              <img 
                src={imageUrl} 
                alt={symbol} 
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {symbol.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Info Token */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold text-sm truncate">{name}</h4>
              <span className="text-xs text-gray-500 flex-shrink-0">{symbol}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500">{coin.uniqueHolders?.toLocaleString() || 0} holders</span>
            </div>
          </div>
          
          {/* Price & TrustScore */}
          <div className="text-right flex-shrink-0">
            <div className="text-white font-mono font-semibold text-sm">{formatPrice(price)}</div>
            <div className="mt-1">
              <TrustScore score={trustScore} size="sm" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Baris 2: Creator Address */}
      {creatorAddress && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
          <span className="text-[10px] text-gray-500">👤 Creator:</span>
          <span className="text-[10px] text-gray-400 font-mono">
            {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onSwap?.(coin); }}
            className="ml-auto text-[10px] text-purple-400 hover:text-purple-300 transition"
          >
            Swap →
          </button>
        </div>
      )}
      
      {/* Jika tidak ada creator address, tetap tampilkan swap button */}
      {!creatorAddress && (
        <div className="flex justify-end mt-2 pt-2 border-t border-white/10">
          <button 
            onClick={(e) => { e.stopPropagation(); onSwap?.(coin); }}
            className="text-[10px] text-purple-400 hover:text-purple-300 transition"
          >
            Swap {symbol} →
          </button>
        </div>
      )}
    </div>
  );
}

// Featured Card
export function FeaturedCoinCard({ coin, onSwap }) {
  const [imgError, setImgError] = useState(false);
  const [pfpError, setPfpError] = useState(false);
  const trustScore = coin.trustScore ?? 50;
  
  if (!coin) return null;
  
  const name = coin.name || 'Unknown Coin';
  const symbol = coin.symbol || '???';
  const price = coin.priceUSD || 0;
  const change = coin.priceChange24h || 0;
  const isPositive = change >= 0;
  let imageUrl = coin.image;
  const marketCap = coin.marketCap || 0;
  const volume = coin.volume24h || 0;
  const holders = coin.uniqueHolders || 0;
  const creatorAddress = coin.creatorAddress || '';
  const farcasterProfile = coin.farcasterProfile;
  
  if (imageUrl) {
    imageUrl = convertIpfsToHttp(imageUrl);
  }
  
  return (
    <div 
      onClick={() => onSwap?.(coin)}
      className="group rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
      style={{ 
        background: 'linear-gradient(135deg, rgba(123,63,228,0.1) 0%, rgba(228,79,192,0.05) 100%)',
        border: '1px solid rgba(123,63,228,0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden shadow-lg" 
          style={{ background: getPlaceholderColor(symbol) }}
        >
          {imageUrl && !imgError ? (
            <img 
              src={imageUrl} 
              alt={symbol} 
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
              {symbol.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-base">{name}</h3>
            <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">{symbol}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </span>
            <span className="text-xs text-gray-500">{holders.toLocaleString()} holders</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xl font-bold text-white">{formatPrice(price)}</div>
          <div className="mt-1">
            <TrustScore score={trustScore} size="sm" />
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="text-center">
          <div className="text-xs text-gray-500">Market Cap</div>
          <div className="text-sm text-white font-semibold">{formatMarketCap(marketCap)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">24h Volume</div>
          <div className="text-sm text-white font-semibold">{formatMarketCap(volume)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Holders</div>
          <div className="text-sm text-white font-semibold">{holders.toLocaleString()}</div>
        </div>
      </div>
      
      {/* Creator */}
      {farcasterProfile ? (
        <div className="mb-3 p-2 rounded-lg flex items-center gap-2" style={{ background: 'rgba(123,63,228,0.15)' }}>
          <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500 flex-shrink-0">
            {farcasterProfile.pfp_url && !pfpError ? (
              <img src={convertIpfsToHttp(farcasterProfile.pfp_url)} alt="" className="w-full h-full object-cover" onError={() => setPfpError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs">👤</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-white text-xs font-medium">@{farcasterProfile.username}</span>
            {farcasterProfile.powerBadge && <span className="text-yellow-400 text-xs ml-1">⚡</span>}
          </div>
          <div className="text-xs text-gray-500">{farcasterProfile.followerCount?.toLocaleString() || 0} followers</div>
        </div>
      ) : creatorAddress ? (
        <div className="mb-3 text-xs text-gray-500 truncate text-center">
          👤 Creator: {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
        </div>
      ) : null}
      
      {/* Swap Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onSwap?.(coin); }}
        className="w-full py-2 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #7B3FE4, #E44FC0)' }}
      >
        🔄 Swap {symbol}
      </button>
    </div>
  );
}

export default function CoinCard({ coin, onSwap, featured = false, compact = false }) {
  if (featured) {
    return <FeaturedCoinCard coin={coin} onSwap={onSwap} />;
  }
  return <CompactCoinCard coin={coin} onSwap={onSwap} />;
}