'use client';

import { useState, useEffect } from 'react';

const MAX_STORAGE_ITEMS = 20;

export default function SearchHistory({ onSelect }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('zoramint_search_history');
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addToSearchHistory = (query, result) => {
        const stored = JSON.parse(localStorage.getItem('zoramint_search_history') || '[]');
        const filtered = stored.filter(i => i.query !== query);
        const newHistory = [{ query, result, timestamp: Date.now() }, ...filtered].slice(0, MAX_STORAGE_ITEMS);
        localStorage.setItem('zoramint_search_history', JSON.stringify(newHistory));
        setHistory(newHistory);
      };
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('zoramint_search_history');
    setHistory([]);
  };

  if (history.length === 0) return null;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <span>📜</span> Recent Searches
        </div>
        <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 transition">Clear All</button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.slice(0, 5).map((item, idx) => (
          <button 
            key={idx} 
            onClick={() => onSelect(item.query)} 
            className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
              <span className="text-gray-400 text-sm">{item.result?.type === 'token' ? '🪙' : '👤'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm truncate font-medium">{item.query}</div>
              <div className="text-xs text-gray-500 truncate">{item.result?.name || item.result?.displayName || 'Unknown'}</div>
            </div>
            <div className="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition">
              🔍
            </div>
          </button>
        ))}
      </div>
      {history.length > 5 && (
        <div className="text-center text-xs text-gray-600 mt-2 pt-2 border-t border-white/10">
          +{history.length - 5} more
        </div>
      )}
    </div>
  );
}