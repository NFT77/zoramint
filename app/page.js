'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WalletConnector } from '@/components/WalletConnector';
import CoinCard from '@/components/CoinCard';
import CreatorCard from '@/components/CreatorCard';
import SwapWidget from '@/components/SwapWidget';
import WalletPortfolio from '@/components/WalletPortfolio';
import SearchHistory from '@/components/SearchHistory';
import {
  getTrendingZoraCoins,
  getNewZoraCoins,
  getTopGainersZoraCoins,
  getEnrichedCoin,
  enrichCoin,
  unifiedSearch,
  getFeaturedCoins,
} from '@/lib/api/zora';

const TABS = ['featured', 'trending', 'new', 'gainers'];
const TAB_LABELS = {
  featured: '⭐ Featured',
  trending: '🔥 Trending',
  new: '✨ New',
  gainers: '🚀 Gainers',
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex-shrink-0" />
        <div className="flex-1"><div className="h-6 w-32 bg-white/10 rounded mb-2" /><div className="h-4 w-20 bg-white/10 rounded" /></div>
        <div className="h-8 w-24 bg-white/10 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/10 rounded-xl" />)}</div>
      <div className="h-12 bg-white/10 rounded-xl" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
      <div className="flex-1"><div className="h-4 w-24 bg-white/10 rounded mb-1.5" /><div className="h-3 w-16 bg-white/10 rounded" /></div>
      <div className="h-4 w-16 bg-white/10 rounded" />
    </div>
  );
}

function SkeletonCreator() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(123,63,228,0.15)' }}>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex-shrink-0" />
        <div className="flex-1"><div className="h-5 w-28 bg-white/10 rounded mb-2" /><div className="h-3 w-20 bg-white/10 rounded mb-1.5" /><div className="h-3 w-40 bg-white/10 rounded" /></div>
      </div>
    </div>
  );
}

function QueryTypeBadge({ query }) {
  const q = query?.trim() || '';
  let type = 'name';
  if (/^0x[a-fA-F0-9]{40}$/i.test(q)) type = 'address';
  else if (q.startsWith('@')) type = 'username';
  const map = { address: { label: 'Contract Address', color: '#10b981', icon: '📋' }, username: { label: 'Username', color: '#8465CB', icon: '🟣' }, name: { label: 'Token Name', color: '#f59e0b', icon: '🔍' } };
  const { label, color, icon } = map[type];
  return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}><span>{icon}</span><span>{label}</span></span>;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('featured');
  const [data, setData] = useState({ featured: [], trending: [], newest: [], gainers: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tokens: [], creators: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [swapCoin, setSwapCoin] = useState(null);
  const [refreshPortfolio, setRefreshPortfolio] = useState(0);
  const searchRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [featuredCoins, trendingCoins, newCoins, gainersCoins] = await Promise.all([
          getFeaturedCoins(), getTrendingZoraCoins(10), getNewZoraCoins(10), getTopGainersZoraCoins(10),
        ]);
        const enrichedFeatured = await Promise.all(featuredCoins.map(c => enrichCoin(c)));
        if (!cancelled) setData({ featured: enrichedFeatured.filter(Boolean), trending: trendingCoins, newest: newCoins, gainers: gainersCoins });
      } catch (e) { if (!cancelled) setError('Failed to load coins'); } finally { if (!cancelled) setIsLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const coinAddr = searchParams.get('coin');
    if (!coinAddr || !/^0x[a-fA-F0-9]{40}$/i.test(coinAddr)) return;
    async function loadCoin() { try { const coin = await getEnrichedCoin(coinAddr); if (isMounted.current && coin?.address) setSwapCoin(coin); } catch (e) {} }
    loadCoin();
  }, [searchParams]);

  const handleSearchFromHistory = useCallback((query) => {
    setSearchQuery(query);
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults({ tokens: [], creators: [] }); setSearchDone(false); return; }
    const t = setTimeout(async () => {
      if (!isMounted.current) return;
      setIsSearching(true);
      setSearchDone(false);
      try {
        const results = await unifiedSearch(q, 15);
        if (isMounted.current) {
          setSearchResults({ tokens: results.tokens || [], creators: results.creators || [] });
          setSearchDone(true);
        }
      } catch (e) { if (isMounted.current) { setSearchResults({ tokens: [], creators: [] }); setSearchDone(true); } } finally { if (isMounted.current) setIsSearching(false); }
    }, 450);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSwap = useCallback((coin) => setSwapCoin(coin), []);
  const handleSwapSuccess = useCallback(() => {
    setRefreshPortfolio(prev => prev + 1);
    setTimeout(() => setSwapCoin(null), 3000);
  }, []);
  const handleCloseSwap = useCallback(() => setSwapCoin(null), []);
  const handleSelectCreator = useCallback((creator) => { if (creator?.username) setSearchQuery(`@${creator.username}`); }, []);

  const currentList = activeTab === 'featured' ? data.featured : activeTab === 'trending' ? data.trending : activeTab === 'new' ? data.newest : data.gainers;
  const isShowingSearch = searchQuery.trim().length > 0;
  const hasResults = searchResults.tokens.length > 0 || searchResults.creators.length > 0;
  const totalResults = searchResults.tokens.length + searchResults.creators.length;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1f 50%, #0a0a0f 100%)' }}>
      {swapCoin && <SwapWidget coin={swapCoin} onSuccess={handleSwapSuccess} onClose={handleCloseSwap} />}
      <nav className="fixed top-0 w-full z-40" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #7B3FE4, #E44FC0)' }}><span className="text-white text-sm font-bold">Z</span></div>
            <div><div className="font-bold text-white text-base">ZoraMint</div><div className="text-xs text-gray-400">Creator Coins on Base</div></div>
          </div>
          <WalletConnector />
        </div>
      </nav>
      <main className="pt-20 pb-12 px-4 max-w-6xl mx-auto">
        <div className="text-center py-12 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-medium animate-pulse" style={{ background: 'rgba(123,63,228,0.2)', border: '1px solid rgba(123,63,228,0.4)', color: '#c4b5fd' }}><span>🟣</span><span>Powered by Zora Protocol • Live on Base Network</span></div>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-4">Swap Creator<br /><span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">Coins Instantly</span></h1>
          <p className="text-gray-400 text-base max-w-md mx-auto">Discover and trade Zora creator coins. Search by token name, <span className="text-purple-400">@username</span>, or <span className="text-purple-400">contract address</span>.</p>
        </div>

        <WalletPortfolio key={refreshPortfolio} onTokenSelect={handleSwap} />

        <div className="mb-4">
          <SearchHistory onSelect={handleSearchFromHistory} />
        </div>

        <div className="relative mb-2 max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">{isSearching ? <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}</div>
          <input ref={searchRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Token name, @username, or 0x contract address..." className="w-full pl-12 pr-12 py-4 rounded-2xl text-white placeholder-gray-500 text-base focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }} onFocus={(e) => e.target.style.borderColor = '#7B3FE4'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          {searchQuery && <div className="absolute inset-y-0 right-4 flex items-center"><button onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }} className="text-gray-500 hover:text-white transition text-xl">✕</button></div>}
        </div>

        {isShowingSearch && !isSearching && (
          <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-2">
            <QueryTypeBadge query={searchQuery} />
            {searchDone && <span className="text-xs text-gray-500">{totalResults === 0 ? 'No results' : `${totalResults} result${totalResults > 1 ? 's' : ''} found`}</span>}
          </div>
        )}

        {isShowingSearch ? (
          <div className="space-y-8 mb-6">
            {isSearching && <div className="space-y-4"><SkeletonCreator /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>}
            {!isSearching && searchResults.creators.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-3 text-purple-400">Creators Found ({searchResults.creators.length})</h3>
                <div className="space-y-3">
                  {searchResults.creators.map((creator, i) => (
                    <CreatorCard key={creator.fid || creator.username || i} creator={creator} onSelectCreator={handleSelectCreator} onSwap={handleSwap} />
                  ))}
                </div>
              </section>
            )}
            {!isSearching && searchResults.tokens.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-3 text-purple-400">Tokens Found ({searchResults.tokens.length})</h3>
                <div className="space-y-2">
                  {searchResults.tokens.map((coin, i) => (
                    <CoinCard key={coin.address || i} coin={coin} onSwap={handleSwap} compact />
                  ))}
                </div>
              </section>
            )}
            {!isSearching && searchDone && !hasResults && <div className="text-center py-16"><div className="text-6xl mb-4">🔍</div><div className="text-white text-lg font-semibold mb-2">No results for "{searchQuery}"</div></div>}
          </div>
        ) : (
          <>
            <div className="sticky top-16 z-30 mb-6 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)' }}>
              <div className="flex gap-1">{TABS.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab ? 'text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`} style={activeTab === tab ? { background: 'linear-gradient(135deg, #7B3FE4, #E44FC0)' } : {}}>{TAB_LABELS[tab]}</button>)}</div>
            </div>
            {error && <div className="text-center py-8 text-red-400">{error}</div>}
            {activeTab === 'featured' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isLoading ? <><SkeletonCard /><SkeletonCard /></> : currentList.length === 0 ? <div className="col-span-2 text-center py-16 text-gray-500">No featured coins</div> : currentList.map((coin, i) => <CoinCard key={coin.address || i} coin={coin} onSwap={handleSwap} featured />)}
              </div>
            )}
            {activeTab !== 'featured' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isLoading ? Array(6).fill(0).map((_, i) => <SkeletonRow key={i} />) : currentList.length === 0 ? <div className="col-span-2 text-center py-16 text-gray-500">No coins available</div> : currentList.map((coin, i) => (
                  <CoinCard key={coin.address || i} coin={coin} onSwap={handleSwap} compact />
                ))}
              </div>
            )}
          </>
        )}
        
        <footer className="mt-16 pt-8 text-center border-t border-white/10">
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#7B3FE4" stroke="#7B3FE4" strokeWidth="1"/>
                <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">Z</text>
              </svg>
              <span>Zora Protocol</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                <line x1="5" y1="5" x2="19" y2="19" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>0x Exchange</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="16" height="16" rx="3" fill="#0052FF" stroke="#0052FF" strokeWidth="1"/>
                <rect x="7" y="7" width="10" height="10" rx="1.5" fill="white" stroke="white" strokeWidth="0.5"/>
              </svg>
              <span>Base Chain</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#8465CB" stroke="#8465CB" strokeWidth="1"/>
                <text x="12" y="17" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">f</text>
              </svg>
              <span>Farcaster</span>
            </div>
          </div>
          <p className="text-xs text-gray-600">© 2026 ZoraMint • Swap creator coins on Base</p>
        </footer>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-12 h-12 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  );
}