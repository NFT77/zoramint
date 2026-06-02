'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

// Fungsi untuk mendapatkan logo asli token dari berbagai sumber
function getTokenLogo(symbol, address) {
  // Logo resmi dari CDN terpercaya (cryptologos.cc)
  const logos = {
    'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    'WETH': 'https://cryptologos.cc/logos/weth-weth-logo.svg',
    'USDC': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    'USDbC': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    'DAI': 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
  };
  
  if (logos[symbol]) return logos[symbol];
  
  // Untuk token Zora, gunakan thumbnail dari Zora API
  if (address && address.startsWith('0x')) {
    return `https://zora.co/api/thumbnail/8453/${address}`;
  }
  
  return null;
}

export default function WalletPortfolio({ onTokenSelect, refreshTrigger }) {
  const { address, isConnected } = useAccount();
  const [portfolio, setPortfolio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    if (!isConnected || !address) {
      setPortfolio(null);
      return;
    }

    async function fetchPortfolio() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/portfolio?address=${address}`);
        if (!res.ok) throw new Error('Failed to fetch portfolio');
        const data = await res.json();
        setPortfolio(data);
      } catch (error) {
        console.error('Portfolio error:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPortfolio();
  }, [address, isConnected, refreshTrigger]);

  const handleImageError = (tokenAddress) => {
    setImageErrors(prev => ({ ...prev, [tokenAddress]: true }));
  };

  if (!isConnected) return null;
  
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
        <div className="text-center py-4 text-gray-400">Loading portfolio...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
        <div className="text-center py-4 text-red-400 text-sm">Failed to load portfolio</div>
      </div>
    );
  }
  
  if (!portfolio || portfolio.tokenCount === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
        <div className="text-center py-4 text-gray-500 text-sm">No tokens found in this wallet</div>
      </div>
    );
  }

  // Pisahkan ETH/Token utama dan Zora tokens
  const baseTokens = portfolio.tokens?.filter(t => t.symbol === 'ETH' || t.symbol === 'USDC' || t.symbol === 'USDbC' || t.symbol === 'DAI' || t.symbol === 'WETH') || [];
  const zoraTokens = portfolio.tokens?.filter(t => !baseTokens.includes(t)) || [];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span>💰</span> My Portfolio
        </h3>
        <div className="text-sm text-purple-400 font-semibold">
          ${parseFloat(portfolio.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {/* Base Chain Tokens (ETH, USDC, dll) */}
        {baseTokens.length > 0 && (
          <>
            <div className="text-xs text-gray-500 px-2 pt-1 pb-1">Base Chain Assets</div>
            {baseTokens.map((token, idx) => {
              const logoSrc = getTokenLogo(token.symbol, token.address);
              const hasError = imageErrors[token.address];
              
              return (
                <button
                  key={token.address || idx}
                  onClick={() => onTokenSelect?.(token)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition group"
                >
                  {/* Logo/Icon asli token */}
                  <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                    {logoSrc && !hasError ? (
                      <img 
                        src={logoSrc} 
                        alt={token.symbol} 
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(token.address)}
                      />
                    ) : (
                      <div className="text-white text-xs font-bold">
                        {token.symbol?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{token.symbol}</span>
                      <span className="text-xs text-gray-500 font-mono truncate hidden sm:inline">
                        {token.address ? `${token.address.slice(0, 6)}...${token.address.slice(-4)}` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">{token.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-white text-sm font-mono">
                      {parseFloat(token.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                    <div className="text-xs text-green-400">
                      ${parseFloat(token.valueUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
        
        {/* Zora Creator Coins */}
        {zoraTokens.length > 0 && (
          <>
            <div className="text-xs text-gray-500 px-2 pt-2 pb-1">Zora Creator Coins</div>
            {zoraTokens.map((token, idx) => {
              const logoSrc = token.logo || getTokenLogo(token.symbol, token.address);
              const hasError = imageErrors[token.address];
              
              return (
                <button
                  key={token.address || idx}
                  onClick={() => onTokenSelect?.(token)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition group"
                >
                  {/* Logo/Icon asli token Zora */}
                  <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                    {logoSrc && !hasError ? (
                      <img 
                        src={logoSrc} 
                        alt={token.symbol} 
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(token.address)}
                      />
                    ) : (
                      <div className="text-white text-xs font-bold">
                        {token.symbol?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{token.symbol}</span>
                      <span className="text-xs text-gray-500 font-mono truncate hidden sm:inline">
                        {token.address ? `${token.address.slice(0, 6)}...${token.address.slice(-4)}` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">{token.name || 'Zora Creator Coin'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-white text-sm font-mono">
                      {parseFloat(token.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                    <div className="text-xs text-green-400">
                      ${parseFloat(token.valueUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
      
      {portfolio.tokenCount > 10 && (
        <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-white/10">
          +{portfolio.tokenCount - 10} more tokens
        </div>
      )}
      
      {/* Informasi kontrak */}
      <div className="mt-3 pt-2 border-t border-white/10 text-xs text-gray-500 text-center">
        <span>📋 Verify token contract on </span>
        <a 
          href={`https://basescan.org/address/${address}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300"
        >
          BaseScan
        </a>
      </div>
    </div>
  );
}