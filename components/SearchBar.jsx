'use client';

import { useState, useRef } from 'react';

export default function SearchBar({ onSearch, isLoading, placeholder }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-gray-400 text-xl">🔍</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || "Search by Token Address, Name, or @Username..."}
            className="w-full pl-12 pr-28 py-4 bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-lg"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-24 flex items-center text-gray-400 hover:text-white transition text-xl"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={`absolute inset-y-0 right-2 my-1.5 px-5 rounded-xl font-medium transition-all duration-200 ${
              query.trim() && !isLoading
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:opacity-90'
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}