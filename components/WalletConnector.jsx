'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnector() {
  const { isConnected, address, status } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [inFarcaster, setInFarcaster] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [autoConnectDone, setAutoConnectDone] = useState(false);
  const attempts = useRef(0);

  // Deteksi lingkungan Farcaster
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const ctx = await Promise.race([
          sdk.context, 
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        if (!cancelled && ctx?.user?.fid) {
          setInFarcaster(true);
          await sdk.actions.ready({ disableNativeGestures: false });
        }
      } catch (err) {
        // Bukan di Farcaster environment
        setInFarcaster(false);
      } finally {
        if (!cancelled) setSdkReady(true);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Cari connector Farcaster
  const fcConnector = connectors.find(c => 
    c.id === 'farcasterFrame' || 
    c.id === 'farcaster-miniapp' ||
    c.type === 'farcasterFrame'
  );

  // Auto connect di Farcaster environment
  const attemptConnect = useCallback(async () => {
    if (!fcConnector) {
      console.warn('Farcaster connector not found');
      return;
    }
    try {
      await connect({ connector: fcConnector });
    } catch (err) {
      console.error('Auto connect failed:', err.message);
    }
  }, [connect, fcConnector]);

  useEffect(() => {
    if (!inFarcaster || !sdkReady || isConnected || status === 'connecting' || isPending || autoConnectDone || !fcConnector || attempts.current >= 3) {
      return;
    }
    
    const timer = setTimeout(() => {
      attempts.current += 1;
      setAutoConnectDone(true);
      attemptConnect();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [inFarcaster, sdkReady, isConnected, status, isPending, autoConnectDone, fcConnector, attemptConnect]);

  // Loading / Reconnecting state
  if (status === 'reconnecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(234,179,8,0.2)' }}>
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        <span className="text-xs text-yellow-300">Reconnecting...</span>
      </div>
    );
  }

  // Connected state
  if (isConnected && address) {
    // Tampilan khusus Farcaster (tanpa tombol disconnect)
    if (inFarcaster) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-300 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
      );
    }
    
    // Tampilan Web (dengan tombol disconnect)
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-300 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        <button 
          onClick={() => disconnect()} 
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg transition" 
          style={{ background: 'rgba(239,68,68,0.1)' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Loading / Pending state
  if (!sdkReady || (inFarcaster && (isPending || status === 'connecting'))) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(123,63,228,0.2)' }}>
        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-purple-300">{inFarcaster ? 'Connecting...' : 'Loading...'}</span>
      </div>
    );
  }

  // Farcaster environment - tombol connect khusus
  if (inFarcaster && fcConnector) {
    return (
      <button 
        onClick={attemptConnect} 
        disabled={isPending} 
        className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #7B3FE4, #E44FC0)' }}
      >
        {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>🟣</span>}
        <span>Connect Wallet</span>
      </button>
    );
  }

  // Web environment - pakai RainbowKit ConnectButton
  return <ConnectButton />;
}