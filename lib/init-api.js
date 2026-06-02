// lib/init-api.js
import { setApiKey } from '@zoralabs/coins-sdk';

// Hanya jalankan di server-side (Next.js server component atau API route)
// Untuk client-side, Zora SDK tidak perlu API key
if (typeof window === 'undefined') {
  const ZORA_API_KEY = process.env.ZORA_API_KEY;
  if (ZORA_API_KEY) {
    setApiKey(ZORA_API_KEY);
    console.log('✅ Zora SDK initialized with API key');
  } else {
    console.warn('⚠️ ZORA_API_KEY not found');
  }
} else {
  console.log('ℹ️ Zora SDK running on client-side (no API key needed)');
}