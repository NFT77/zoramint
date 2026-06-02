/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Matikan source maps di production (keamanan)
  productionBrowserSourceMaps: false,
  
  // Hapus console.log di production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'cryptologos.cc' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'zora.co' },
      { protocol: 'https', hostname: 'api-sdk.zora.engineering' },
    ],
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Keamanan: Izinkan frame untuk Farcaster
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          
          // CSP untuk keamanan
          { 
            key: 'Content-Security-Policy', 
            value: "frame-ancestors https://warpcast.com https://*.warpcast.com https://farcaster.xyz; default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https://api.0x.org https://api-sdk.zora.engineering https://api.neynar.com https://mainnet.base.org;" 
          },
          
          // CORS untuk API
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, api-key, 0x-api-key' },
          
          // Keamanan tambahan
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  
  // Optimasi untuk Vercel
  swcMinify: true,
  
  // Matikan telemetry (opsional)
  // telemetry: false,
};

module.exports = nextConfig;