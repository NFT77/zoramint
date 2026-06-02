'use client';

import { useState, useCallback } from 'react';

// ============================================================
// HELPERS
// ============================================================
function convertIpfsToHttp(url) {
  if (!url) return null;
  if (url.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  if (url.startsWith('/ipfs/')) return `https://ipfs.io/ipfs/${url.replace('/ipfs/', '')}`;
  if (url.startsWith('ar://')) return `https://arweave.net/${url.replace('ar://', '')}`;
  return url;
}

function getPlaceholderColor(str) {
  if (!str) return '#7B3FE4';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash % 360)}, 70%, 55%)`;
}

function formatPrice(p) {
  const n = parseFloat(p || 0);
  if (n === 0) return '$0';
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 0.0001) return `$${n.toFixed(7)}`;
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString()}`;
}

function formatMC(n) {
  const num = parseFloat(n || 0);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return num > 0 ? `$${num.toFixed(0)}` : '—';
}

function formatCount(n) {
  const num = parseInt(n || 0);
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

function buildTokenImageCandidates(coin) {
  const candidates = [];
  if (coin.image) candidates.push(convertIpfsToHttp(coin.image));
  if (Array.isArray(coin.imageFallbacks)) {
    coin.imageFallbacks.forEach(u => { if (u) candidates.push(u); });
  }
  if (coin.address) {
    candidates.push(`https://zora.co/api/thumbnail/8453/${coin.address}`);
  }
  return [...new Set(candidates.filter(Boolean))];
}

// ============================================================
// TOKEN AVATAR
// ============================================================
function TokenAvatar({ coin }) {
  const candidates = buildTokenImageCandidates(coin);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = !failed && candidates[idx] ? candidates[idx] : null;

  const handleError = useCallback(() => {
    if (idx + 1 < candidates.length) setIdx(i => i + 1);
    else setFailed(true);
  }, [idx, candidates.length]);

  const symbol = coin?.symbol || '?';
  return (
    <div
      className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden shadow-md"
      style={{ background: getPlaceholderColor(symbol) }}
    >
      {src ? (
        <img src={src} alt={symbol} className="w-full h-full object-cover"
          onError={handleError} loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
          {symbol.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CREATOR AVATAR
// ============================================================
function CreatorAvatar({ pfp, username, size = 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const url = convertIpfsToHttp(pfp);
  const sizeClass = size === 'xl' ? 'w-20 h-20 text-2xl'
    : size === 'lg' ? 'w-16 h-16 text-xl'
    : 'w-12 h-12 text-lg';

  return (
    <div className={`${sizeClass} rounded-2xl flex-shrink-0 overflow-hidden shadow-xl`}
      style={{ background: getPlaceholderColor(username || '') }}>
      {url && !imgError ? (
        <img src={url} alt={username} className="w-full h-full object-cover"
          onError={() => setImgError(true)} loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-bold">
          {(username || '?').charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COIN CHIP
// ============================================================
function CoinChip({ coin, onSwap }) {
  const change = coin.priceChange24h || 0;
  const isPos  = change >= 0;

  return (
    <button
      onClick={e => { e.stopPropagation(); onSwap?.(coin); }}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150
                 hover:scale-[1.02] active:scale-[0.98] text-left w-full group/chip"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <TokenAvatar coin={coin} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-white text-xs font-semibold truncate max-w-[90px]">
            {coin.name || coin.symbol}
          </span>
          <span className={`text-xs font-semibold flex-shrink-0 ${isPos ? 'text-green-400' : 'text-red-400'}`}>
            {isPos ? '▲' : '▼'}{Math.abs(change).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-gray-500 text-xs">{coin.symbol}</span>
          <span className="text-gray-300 text-xs font-mono">{formatPrice(coin.priceUSD)}</span>
        </div>
        {(coin.marketCap > 0 || coin.uniqueHolders > 0) && (
          <div className="flex items-center gap-2 mt-0.5">
            {coin.marketCap > 0 && (
              <span className="text-gray-600 text-xs">{formatMC(coin.marketCap)}</span>
            )}
            {coin.uniqueHolders > 0 && (
              <span className="text-gray-600 text-xs">{formatCount(coin.uniqueHolders)} holders</span>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-purple-400 opacity-40 group-hover/chip:opacity-100 transition-opacity">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </div>
    </button>
  );
}

// ============================================================
// WALLET BADGE
// ============================================================
function WalletBadge({ address }) {
  if (!address) return null;
  return (
    <a
      href={`https://basescan.org/address/${address}`}
      target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500
                 hover:text-gray-300 transition-colors"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      title={address}
    >
      <span>💳</span>
      <span className="font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
      <span className="text-gray-600">↗</span>
    </a>
  );
}

// ============================================================
// SOCIAL LINKS - FARCASTER (bukan Warpcast)
// ============================================================
function SocialLinks({ creator, zoraProfile, stopProp = true }) {
  const links = [];

  // PRIORITAS: Farcaster username dari Zora profile (yang terhubung)
  const farcasterUsername = zoraProfile?.farcasterUsername || creator?.farcasterUsername;
  
  if (farcasterUsername) {
    links.push({
      label: 'Farcaster',
      href: `https://warpcast.com/${farcasterUsername}`,
      color: '#8465CB',
      icon: '🟣',
    });
  } else if (creator?.username && creator?.source === 'farcaster') {
    // Fallback: jika creator dari Farcaster langsung
    links.push({
      label: 'Farcaster',
      href: `https://warpcast.com/${creator.username}`,
      color: '#8465CB',
      icon: '🟣',
    });
  }

  // Zora profile link
  const zoraHandle = zoraProfile?.zoraHandle || creator?.zoraHandle;
  if (zoraHandle) {
    links.push({
      label: 'Zora',
      href: `https://zora.co/${zoraHandle}`,
      color: '#7B3FE4',
      icon: '🪙',
    });
  }

  // Twitter
  const twitterUsername = zoraProfile?.twitterUsername;
  if (twitterUsername) {
    links.push({
      label: `@${twitterUsername}`,
      href: `https://x.com/${twitterUsername}`,
      color: '#1d9bf0',
      icon: '𝕏',
    });
  }

  // Instagram
  const instagramUsername = zoraProfile?.instagramUsername;
  if (instagramUsername) {
    links.push({
      label: `@${instagramUsername}`,
      href: `https://instagram.com/${instagramUsername}`,
      color: '#e1306c',
      icon: '📸',
    });
  }

  // Website
  if (zoraProfile?.website) {
    const site = zoraProfile.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
    links.push({
      label: site.slice(0, 20),
      href: zoraProfile.website,
      color: '#6b7280',
      icon: '🌐',
    });
  }

  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {links.map((l, i) => (
        <a
          key={i}
          href={l.href}
          target="_blank" rel="noopener noreferrer"
          onClick={stopProp ? e => e.stopPropagation() : undefined}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-opacity hover:opacity-100 opacity-70"
          style={{ background: `${l.color}20`, color: l.color, border: `1px solid ${l.color}40` }}
        >
          <span style={{ fontSize: '10px' }}>{l.icon}</span>
          <span>{l.label}</span>
        </a>
      ))}
    </div>
  );
}

// ============================================================
// CREATOR COIN BADGE
// ============================================================
function CreatorCoinBadge({ creatorCoin }) {
  if (!creatorCoin?.address) return null;
  const change = parseFloat(creatorCoin.marketCapDelta24h || 0);
  const isPos  = change >= 0;

  return (
    <a
      href={`https://zora.co/coin/base:${creatorCoin.address}`}
      target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-opacity hover:opacity-100 opacity-80"
      style={{ background: 'rgba(123,63,228,0.15)', border: '1px solid rgba(123,63,228,0.25)' }}
    >
      <span className="text-purple-300 font-semibold">Creator Coin</span>
      {creatorCoin.marketCap && (
        <span className="text-gray-400">{formatMC(parseFloat(creatorCoin.marketCap))}</span>
      )}
      {change !== 0 && (
        <span className={`font-semibold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
          {isPos ? '▲' : '▼'}{Math.abs(change).toFixed(1)}%
        </span>
      )}
      <span className="text-gray-600">↗</span>
    </a>
  );
}

// ============================================================
// CREATOR CARD UTAMA
// ============================================================
export default function CreatorCard({ creator, onSelectCreator, onSwap }) {
  const [expanded, setExpanded] = useState(false);

  if (!creator) return null;

  const username      = creator.username     || '';
  const displayName   = creator.displayName  || username;
  const bio           = creator.bio          || '';
  const followerCount = creator.followerCount  || 0;
  const followingCount = creator.followingCount || 0;
  const powerBadge    = creator.powerBadge   || false;
  const verifiedAddr  = creator.verifiedAddresses || [];
  const coins         = creator.coins        || [];
  const hasCoins      = coins.length > 0;
  
  const zoraProfile   = creator.zoraProfile || null;
  
  const pfp = creator.pfp_url || zoraProfile?.zoraPfp || null;
  const displayBio = bio || zoraProfile?.zoraBio || '';
  
  const hasFarcaster = !!creator.fid;
  const hasZoraOnly = !hasFarcaster && (zoraProfile?.zoraHandle || creator.username);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${hasFarcaster ? 'rgba(132,101,203,0.25)' : 'rgba(123,63,228,0.2)'}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        onClick={() => setExpanded(v => !v)}
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="relative flex-shrink-0">
          <CreatorAvatar pfp={pfp} username={username} size="lg" />
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-lg"
            style={{
              background: hasFarcaster ? '#8465CB' : '#7B3FE4',
              border: '2px solid #0a0a0f',
            }}
            title={hasFarcaster ? 'Farcaster user' : (hasZoraOnly ? 'Zora creator' : 'Creator')}
          >
            {hasFarcaster ? '🟣' : '🪙'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-bold text-base leading-tight">{displayName}</span>
            {powerBadge && <span className="text-yellow-400 text-sm" title="Farcaster Power Badge">⚡</span>}
            {verifiedAddr.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium leading-none" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: '9px' }}>✓ VERIFIED</span>
            )}
            {hasFarcaster ? (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium leading-none" style={{ background: 'rgba(132,101,203,0.25)', color: '#c4b5fd', fontSize: '9px' }}>FARCASTER</span>
            ) : hasZoraOnly ? (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium leading-none" style={{ background: 'rgba(123,63,228,0.25)', color: '#c4b5fd', fontSize: '9px' }}>ZORA</span>
            ) : null}
          </div>

          {username && <div className="text-purple-400 text-xs font-medium mt-0.5">@{username}</div>}

          {displayBio && (
            <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">
              {displayBio.slice(0, 100)}{displayBio.length > 100 ? '…' : ''}
            </p>
          )}

          <SocialLinks creator={creator} zoraProfile={zoraProfile} />

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {followerCount > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-white font-semibold tabular-nums">{formatCount(followerCount)}</span>
                <span className="text-gray-600">followers</span>
              </div>
            )}
            {followingCount > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-white font-semibold tabular-nums">{formatCount(followingCount)}</span>
                <span className="text-gray-600">following</span>
              </div>
            )}
            {hasCoins && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-purple-400 font-semibold">{coins.length}</span>
                <span className="text-gray-600">coin{coins.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {zoraProfile?.creatorCoin && (
            <div className="mt-2"><CreatorCoinBadge creatorCoin={zoraProfile.creatorCoin} /></div>
          )}
        </div>

        {hasCoins && (
          <div className="flex-shrink-0 mt-1">
            <div className="text-gray-500 transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {verifiedAddr.length > 0 && !expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {verifiedAddr.slice(0, 3).map((addr, i) => <WalletBadge key={i} address={addr} />)}
          {verifiedAddr.length > 3 && <span className="text-xs text-gray-600 px-2 py-1">+{verifiedAddr.length - 3} more</span>}
        </div>
      )}

      {expanded && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {verifiedAddr.length > 0 && (
            <div className="pt-3 pb-2">
              <div className="text-xs text-gray-600 mb-1.5 font-medium">Linked wallets</div>
              <div className="flex flex-wrap gap-1.5">{verifiedAddr.map((addr, i) => <WalletBadge key={i} address={addr} />)}</div>
            </div>
          )}

          {zoraProfile && zoraProfile.zoraBio && !bio && (
            <div className="mt-2 mb-3 p-2.5 rounded-xl text-xs" style={{ background: 'rgba(123,63,228,0.08)', border: '1px solid rgba(123,63,228,0.15)' }}>
              <p className="text-gray-400">{zoraProfile.zoraBio.slice(0, 120)}</p>
            </div>
          )}

          {hasCoins ? (
            <>
              <div className="text-xs text-gray-500 font-medium pt-1 pb-2 flex items-center gap-1.5">
                <span>🪙</span>
                <span>Tokens by @{username}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>{coins.length}</span>
              </div>
              <div className="space-y-1.5">{coins.map((coin, i) => <CoinChip key={coin.address || i} coin={coin} onSwap={onSwap} />)}</div>
              <button onClick={e => { e.stopPropagation(); onSelectCreator?.(creator); }} className="w-full mt-3 py-2 rounded-xl text-xs font-semibold text-purple-300 transition-all duration-150 hover:text-white hover:bg-purple-500/20 active:scale-[0.98]" style={{ border: '1px solid rgba(123,63,228,0.3)' }}>Search all by @{username} →</button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mt-2 text-xs text-gray-500" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span>🔍</span>
              <span>No Zora coins found for this creator yet</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}