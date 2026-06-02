'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useWalletClient, useSendTransaction } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';

const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const BASE_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', address: 'ETH', decimals: 18, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png' },
  { symbol: 'USDC', name: 'USD Coin', address: USDC, decimals: 6, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png' },
  { symbol: 'WETH', name: 'Wrapped ETH', address: WETH, decimals: 18, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x4200000000000000000000000000000000000006/logo.png' },
];

async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
}

function formatOut(n, decimals = 6) {
  if (!n || isNaN(n)) return '0';
  return parseFloat(n).toFixed(Math.min(decimals, 6));
}

export default function SwapWidget({ coin, onSuccess, onClose }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { sendTransactionAsync } = useSendTransaction();

  // State untuk dua arah swap
  const [payToken, setPayToken] = useState(BASE_TOKENS[0]);
  const [receiveToken, setReceiveToken] = useState(() => ({
    symbol: coin?.symbol || '???',
    name: coin?.name || '',
    address: coin?.address || '',
    decimals: coin?.decimals || 18,
    logo: coin?.image || null,
  }));
  
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPaySelector, setShowPaySelector] = useState(false);
  const [showReceiveSelector, setShowReceiveSelector] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);

  // Update receiveToken ketika coin berubah
  useEffect(() => {
    setReceiveToken({
      symbol: coin?.symbol || '???',
      name: coin?.name || '',
      address: coin?.address || '',
      decimals: coin?.decimals || 18,
      logo: coin?.image || null,
    });
  }, [coin]);

  const payTokenAddress = payToken.address === 'ETH' ? NATIVE_ETH : payToken.address;
  const receiveTokenAddress = receiveToken.address === 'ETH' ? NATIVE_ETH : receiveToken.address;
  const amountNum = parseFloat(amount) || 0;

  // Clear messages
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 6000); return () => clearTimeout(t); }
  }, [success]);

  // Reverse swap direction (Buy ↔ Sell)
  const handleReverseSwap = useCallback(() => {
    // Tukar payToken dengan receiveToken
    const tempPay = { ...payToken };
    setPayToken(receiveToken);
    setReceiveToken(tempPay);
    setAmount(''); // Reset amount karena token berubah
    setQuote(null);
    setNeedsApproval(false);
    setError('');
  }, [payToken, receiveToken]);

  // Fetch quote with debounce
  useEffect(() => {
    let cancelled = false;
    async function fetchQuote() {
      if (!amountNum || !receiveTokenAddress) { setQuote(null); setNeedsApproval(false); return; }
      setIsLoadingQuote(true);
      setError('');
      try {
        const takerParam = address ? `&taker=${address}` : '';
        const res = await fetchWithTimeout(`/api/swap/quote?tokenIn=${payTokenAddress}&tokenOut=${receiveTokenAddress}&amount=${amount}&slippage=${slippage}${takerParam}`, {}, 15000);
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Quote error ${res.status}`); }
        const data = await res.json();
        if (!cancelled) {
          setQuote(data);
          setNeedsApproval(!!data.allowanceTarget);
          setApprovalTarget(data.allowanceTarget);
        }
      } catch (e) {
        if (!cancelled) { setError(e.message); setQuote(null); }
      } finally {
        if (!cancelled) setIsLoadingQuote(false);
      }
    }
    const timer = setTimeout(fetchQuote, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [amountNum, payTokenAddress, receiveTokenAddress, slippage, address, amount]);

  // Handle approval with EXACT AMOUNT (NOT unlimited)
  const handleApproval = useCallback(async () => {
    if (!address || !walletClient || !approvalTarget || payTokenAddress === NATIVE_ETH) return;
    
    setIsApproving(true);
    setError('');
    
    try {
      const exactAmount = parseUnits(amount, payToken.decimals);
      const { request } = await walletClient.simulateContract({
        address: payTokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [approvalTarget, exactAmount],
        account: address,
      });
      
      const hash = await walletClient.writeContract(request);
      setTxHash(hash);
      
      let attempts = 0;
      const maxAttempts = 30;
      const checkInterval = setInterval(async () => {
        try {
          const tx = await walletClient.getTransactionReceipt({ hash });
          if (tx) {
            clearInterval(checkInterval);
            setNeedsApproval(false);
            setSuccess(`✅ Token approved! You can now swap.`);
            setTimeout(() => setSuccess(''), 3000);
          }
        } catch (e) {}
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          setError('Approval confirmation timeout.');
        }
      }, 1000);
    } catch (err) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('user rejected') || msg.includes('denied')) {
        setError('Approval rejected.');
      } else {
        setError(`Approval failed: ${err.shortMessage || err.message || 'Unknown error'}`);
      }
    } finally {
      setIsApproving(false);
    }
  }, [address, walletClient, approvalTarget, payTokenAddress, payToken.decimals, amount]);

  // Execute swap
  const handleSwap = useCallback(async () => {
    if (!quote || !address || !isConnected) return;
    setIsExecuting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithTimeout('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tokenIn: payTokenAddress, 
          tokenOut: receiveTokenAddress, 
          amount, 
          slippage, 
          userAddress: address 
        }),
      }, 20000);

      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Execute error ${res.status}`); }
      const result = await res.json();
      if (!result.success || !result.transaction) throw new Error(result.error || 'No transaction data');

      const tx = {
        to: result.transaction.to,
        data: result.transaction.data,
        value: BigInt(result.transaction.value || '0'),
      };
      if (result.transaction.gas) tx.gas = BigInt(result.transaction.gas);

      const hash = await sendTransactionAsync(tx);
      setTxHash(hash);
      setSuccess(`✅ Swapped ${amount} ${payToken.symbol} → ${receiveToken.symbol}!`);
      onSuccess?.();
    } catch (e) {
      const msg = e.message?.toLowerCase() || '';
      if (msg.includes('user rejected') || msg.includes('denied')) setError('Transaction rejected.');
      else if (msg.includes('insufficient')) setError('Insufficient balance.');
      else setError(`Swap failed: ${e.shortMessage || e.message || 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  }, [quote, address, isConnected, amount, payTokenAddress, payToken.symbol, receiveTokenAddress, receiveToken.symbol, slippage, sendTransactionAsync, onSuccess]);

  const hasQuote = !!quote?.success;
  const estimatedOut = quote?.amountOut || 0;
  const isNative = payToken.address === 'ETH';
  const needsApprovalStep = !isNative && needsApproval && amountNum > 0;
  const isProcessing = isApproving || isExecuting;
  const disabled = !amountNum || !hasQuote || isProcessing || !isConnected;
  
  const buttonText = !isConnected ? 'Connect Wallet' :
                     !amountNum ? 'Enter amount' :
                     needsApprovalStep ? `Approve ${payToken.symbol}` :
                     !hasQuote && !isLoadingQuote ? 'No quote available' :
                     isLoadingQuote ? 'Getting quote...' :
                     isApproving ? 'Approving...' :
                     isExecuting ? 'Swapping...' :
                     `Swap ${amountNum} ${payToken.symbol} → ${receiveToken.symbol}`;

  if (!coin) return null;

  // Tokens for selector (BASE_TOKENS + current coin)
  const allPayTokens = [...BASE_TOKENS];
  const allReceiveTokens = [...BASE_TOKENS, { 
    symbol: receiveToken.symbol, 
    name: receiveToken.name, 
    address: receiveToken.address, 
    decimals: receiveToken.decimals, 
    logo: receiveToken.logo 
  }].filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md glass rounded-t-3xl sm:rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {receiveToken.logo && (
              <img src={receiveToken.logo} alt={receiveToken.symbol} className="w-8 h-8 rounded-full object-cover" onError={e => e.target.style.display = 'none'} />
            )}
            <div>
              <h3 className="font-bold text-white">Swap {receiveToken.symbol}</h3>
              <p className="text-xs text-gray-400">{receiveToken.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={() => setError('')} className="text-xs text-red-300 mt-1 underline">Dismiss</button>
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
              <p className="text-green-400 text-sm">{success}</p>
              {txHash && (
                <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-300 hover:underline font-mono">
                  {txHash.slice(0, 12)}...{txHash.slice(-8)} →
                </a>
              )}
            </div>
          )}

          {/* Pay Section */}
          <div className="p-3 bg-black/30 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">You pay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowPaySelector(!showPaySelector)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl hover:bg-white/15 transition disabled:opacity-50"
                >
                  {payToken.logo && <img src={payToken.logo} alt="" className="w-5 h-5 rounded-full" onError={e => e.target.style.display = 'none'} />}
                  <span className="text-white text-sm font-medium">{payToken.symbol}</span>
                  <span className="text-gray-400 text-xs">▾</span>
                </button>
                {showPaySelector && (
                  <div className="absolute top-full left-0 mt-1 w-40 glass rounded-xl border border-white/10 overflow-hidden z-10">
                    {allPayTokens.map(t => (
                      <button key={t.symbol} onClick={() => { setPayToken(t); setShowPaySelector(false); setAmount(''); setQuote(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition">
                        {t.logo && <img src={t.logo} alt="" className="w-5 h-5 rounded-full" onError={e => e.target.style.display = 'none'} />}
                        <span className="text-white text-sm">{t.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0"
                disabled={isProcessing}
                className="flex-1 bg-transparent text-xl text-white text-right outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Reverse Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleReverseSwap}
              disabled={isProcessing}
              className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-sm hover:scale-110 transition disabled:opacity-50"
            >
              ↕️
            </button>
          </div>

          {/* Receive Section */}
          <div className="p-3 bg-black/30 rounded-xl">
            <span className="text-xs text-gray-400 block mb-2">You receive (estimated)</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowReceiveSelector(!showReceiveSelector)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl hover:bg-white/15 transition disabled:opacity-50"
                >
                  {receiveToken.logo && <img src={receiveToken.logo} alt="" className="w-5 h-5 rounded-full" onError={e => e.target.style.display = 'none'} />}
                  <span className="text-white text-sm font-medium">{receiveToken.symbol}</span>
                  <span className="text-gray-400 text-xs">▾</span>
                </button>
                {showReceiveSelector && (
                  <div className="absolute top-full left-0 mt-1 w-40 glass rounded-xl border border-white/10 overflow-hidden z-10">
                    {allReceiveTokens.map(t => (
                      <button key={t.symbol} onClick={() => { setReceiveToken(t); setShowReceiveSelector(false); setAmount(''); setQuote(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition">
                        {t.logo && <img src={t.logo} alt="" className="w-5 h-5 rounded-full" onError={e => e.target.style.display = 'none'} />}
                        <span className="text-white text-sm">{t.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 text-right">
                {isLoadingQuote
                  ? <span className="text-gray-400 text-sm animate-pulse">...</span>
                  : <span className="text-xl text-white font-mono">{formatOut(estimatedOut)}</span>}
              </div>
            </div>
          </div>

          {/* Slippage */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Slippage tolerance</span>
            <div className="flex gap-1">
              {[0.5, 1, 2, 3].map(s => (
                <button key={s} onClick={() => setSlippage(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${slippage === s ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Fee info */}
          {hasQuote && amountNum > 0 && (
            <div className="flex justify-between text-xs text-gray-500 px-1">
              <span>Platform fee (0.3%)</span>
              <span>{(amountNum * 0.003).toFixed(6)} {payToken.symbol}</span>
            </div>
          )}

          {/* Loading/Processing */}
          {(isLoadingQuote || isProcessing) && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-purple-300">
                {isLoadingQuote ? 'Getting best price...' : isApproving ? 'Approving token...' : 'Swapping...'}
              </span>
            </div>
          )}

          {/* Connect wallet notice */}
          {!isConnected && amountNum > 0 && (
            <div className="p-2 bg-blue-500/20 rounded-xl text-center text-xs text-blue-300">
              🔌 Connect wallet to swap
            </div>
          )}

          {/* Approval notice */}
          {needsApprovalStep && !isApproving && (
            <div className="p-2 bg-yellow-500/20 rounded-xl text-center text-xs text-yellow-300">
              ⚠️ First time swapping {payToken.symbol}. Please approve exact amount first.
            </div>
          )}

          {/* Action button */}
          <button
            onClick={needsApprovalStep ? handleApproval : handleSwap}
            disabled={disabled}
            className={`w-full py-4 rounded-xl font-bold text-sm transition ${!disabled ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:opacity-90' : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}
          >
            {buttonText}
          </button>

          {/* Security note */}
          <p className="text-center text-xs text-gray-600">🛡️ Exact approval • 0.3% fee • Powered by 0x</p>
        </div>
      </div>
    </div>
  );
}