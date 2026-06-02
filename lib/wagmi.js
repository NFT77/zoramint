// lib/api/wagmi.js
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterFrame } from '@farcaster/miniapp-wagmi-connector';

// Konfigurasi untuk Farcaster Mini App
export const farcasterConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http('https://mainnet.base.org') },
  connectors: [farcasterFrame()],
});

// Helper untuk mengecek apakah di Farcaster environment
export const isFarcasterEnvironment = () => {
  if (typeof window === 'undefined') return false;
  return window.parent !== window || 
    navigator.userAgent.includes('Farcaster') ||
    window.location.search.includes('farcaster=true');
};