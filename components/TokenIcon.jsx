'use client';

import { useState, useEffect } from 'react';

// Fungsi konversi IPFS ke HTTP
function convertIpfsToHttp(url) {
  if (!url) return null;
  if (url.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  if (url.startsWith('/ipfs/')) return `https://ipfs.io/ipfs/${url.replace('/ipfs/', '')}`;
  return url;
}

// Fungsi untuk mendapatkan warna dari symbol
function getColorFromSymbol(sym) {
  if (!sym) return 'linear-gradient(135deg, #7B3FE4, #E44FC0)';
  
  // Warna berdasarkan karakter pertama
  const colors = [
    'linear-gradient(135deg, #3b82f6, #8b5cf6)', // Biru ke ungu
    'linear-gradient(135deg, #10b981, #06b6d4)', // Hijau ke cyan
    'linear-gradient(135deg, #f59e0b, #ef4444)', // Orange ke merah
    'linear-gradient(135deg, #ec4899, #8b5cf6)', // Pink ke ungu
    'linear-gradient(135deg, #14b8a6, #3b82f6)', // Teal ke biru
    'linear-gradient(135deg, #a855f7, #ec4899)', // Ungu ke pink
  ];
  
  const index = sym.charCodeAt(0) % colors.length;
  return colors[index];
}

// Logo fallback untuk token populer
function getKnownTokenLogo(symbol, address) {
  const knownLogos = {
    'ETH': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    'WETH': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x4200000000000000000000000000000000000006/logo.png',
    'USDC': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png',
    'DAI': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
  };
  
  if (knownLogos[symbol]) return knownLogos[symbol];
  
  // Untuk token Zora, gunakan thumbnail API
  if (address && address.startsWith('0x')) {
    return `https://zora.co/api/thumbnail/8453/${address}`;
  }
  
  return null;
}

export default function TokenIcon({ tokenAddress, symbol, logoUrl, size = 40, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setImgError(false);
    
    // Prioritas: logoUrl -> knownTokenLogo -> null
    let url = logoUrl || getKnownTokenLogo(symbol, tokenAddress);
    
    if (url) {
      url = convertIpfsToHttp(url);
      setCurrentImageUrl(url);
    } else {
      setCurrentImageUrl(null);
    }
    
    setIsLoading(false);
  }, [tokenAddress, symbol, logoUrl]);

  // Jika loading
  if (isLoading) {
    return (
      <div 
        className={`rounded-full flex items-center justify-center shadow-lg animate-pulse ${className}`}
        style={{ width: size, height: size, background: 'rgba(255,255,255,0.1)' }}
      />
    );
  }

  // Jika error atau tidak ada image
  if (imgError || !currentImageUrl) {
    return (
      <div 
        className={`rounded-full flex items-center justify-center text-white font-bold shadow-lg ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4, background: getColorFromSymbol(symbol) }}
      >
        {symbol?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }

  // Tampilkan gambar
  return (
    <div style={{ width: size, height: size }} className={`relative flex-shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={currentImageUrl} 
        alt={symbol || 'Token'} 
        width={size} 
        height={size}
        className="rounded-full object-cover w-full h-full" 
        onError={() => setImgError(true)}
        loading="lazy"
      />
    </div>
  );
}