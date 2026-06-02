'use client';

import { useState, useEffect } from 'react';

export default function TrustScore({ score, size = 'md', showDetails = false }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    if (!score && score !== 0) return;
    let start = 0;
    const end = Math.min(100, Math.max(0, score));
    const duration = 500;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = end / steps;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [score]);
  
  const getColor = () => {
    const s = animatedScore || score || 0;
    if (s >= 80) return { text: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/30' };
    if (s >= 60) return { text: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30' };
    if (s >= 40) return { text: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30' };
    return { text: 'text-red-400', bg: 'bg-red-400/20', border: 'border-red-400/30' };
  };

  const getLabel = () => {
    const s = score || 0;
    if (s >= 80) return { label: 'Very High', icon: '🛡️', description: 'Audited, verified, high liquidity' };
    if (s >= 65) return { label: 'High', icon: '✅', description: 'Verified contract, good liquidity' };
    if (s >= 50) return { label: 'Medium', icon: '⚠️', description: 'Caution: Low liquidity or new token' };
    if (s >= 35) return { label: 'Low', icon: '🔍', description: 'Risky: Check contract manually' };
    return { label: 'Very Low', icon: '🚨', description: 'Avoid: Potential scam or honeypot' };
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1.5';
  const scoreSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const info = getLabel();
  const colors = getColor();
  const displayScore = animatedScore || score || 0;

  return (
    <div className={`inline-flex flex-col items-center ${showDetails ? 'w-full' : ''}`}>
      <div 
        className={`flex items-center gap-2 rounded-full ${sizeClass} ${colors.bg} ${colors.border} border`}
      >
        <span className={colors.text}>{info.icon}</span>
        <span className={`font-semibold ${colors.text} ${scoreSize}`}>{displayScore}</span>
        <span className="text-gray-400 text-xs">/100</span>
      </div>
      
      {showDetails && (
        <div className="mt-2 text-center">
          <div className={`font-semibold text-sm ${colors.text}`}>{info.label} Trust</div>
          <div className="text-xs text-gray-500 max-w-xs">{info.description}</div>
        </div>
      )}
      
      {!showDetails && (
        <div className="text-xs text-gray-500 mt-1">{info.label}</div>
      )}
    </div>
  );
}