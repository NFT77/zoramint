'use client';

import { useState, useEffect } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterFrame } from '@farcaster/miniapp-wagmi-connector';
import '@rainbow-me/rainbowkit/styles.css';

// Import init API
import '@/lib/init-api';

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: 2, 
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    } 
  },
});

// Konfigurasi untuk web (RainbowKit)
const webConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http('https://mainnet.base.org') },
});

// Konfigurasi untuk Farcaster Mini App
const farcasterConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http('https://mainnet.base.org') },
  connectors: [farcasterFrame()],
});

// Deteksi apakah di Farcaster environment
const isFarcasterEnvironment = () => {
  if (typeof window === 'undefined') return false;
  
  // Cek berbagai indikator Farcaster
  const urlParams = new URLSearchParams(window.location.search);
  const isFrame = window.parent !== window;
  const hasFarcasterParam = urlParams.get('farcaster') === 'true';
  const userAgent = navigator.userAgent.toLowerCase();
  const isWarpcast = userAgent.includes('warpcast') || userAgent.includes('farcaster');
  
  return isFrame || hasFarcasterParam || isWarpcast;
};

export function Providers({ children }) {
  const [mounted, setMounted] = useState(false);
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    const checkEnvironment = async () => {
      // Deteksi cepat dari URL/UserAgent
      const quickDetect = isFarcasterEnvironment();
      
      if (quickDetect) {
        setIsFarcaster(true);
        
        // Coba load SDK Farcaster
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          if (!cancelled) {
            setSdkLoaded(true);
            // Notify Farcaster that app is ready (tanpa error jika bukan di mini app)
            try {
              await sdk.actions.ready({ disableNativeGestures: false });
            } catch (err) {
              console.log('SDK ready call skipped:', err.message);
            }
          }
        } catch (err) {
          console.log('Farcaster SDK not available, using web mode');
          if (!cancelled) setIsFarcaster(false);
        }
      }
      
      if (!cancelled) {
        setMounted(true);
      }
    };
    
    checkEnvironment();
    return () => { cancelled = true; };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading ZoraMint...</p>
        </div>
      </div>
    );
  }

  // Gunakan konfigurasi yang sesuai
  const config = isFarcaster ? farcasterConfig : webConfig;

  // Farcaster Mini App mode (tanpa RainbowKit)
  if (isFarcaster) {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  // Web mode (dengan RainbowKit)
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({ 
            accentColor: '#7B3FE4', 
            borderRadius: 'large',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}