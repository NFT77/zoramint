import { Providers } from './providers';
import './globals.css';

const BASE_URL = 'https://zoramint.vercel.app';

export const metadata = {
  title: 'ZoraMint — Swap Creator Coins on Base',
  description: 'Discover and swap Zora creator coins on Base. See creator profiles, Farcaster connections, price charts and more. 0.3% fee only.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'ZoraMint — Swap Creator Coins',
    description: 'Discover and swap Zora creator coins on Base with Farcaster profiles.',
    url: BASE_URL,
    siteName: 'ZoraMint',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZoraMint — Swap Creator Coins',
    description: 'Swap Zora creator coins on Base. 0.3% fee only.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7B3FE4',
};

export default function RootLayout({ children }) {
  const miniAppEmbed = {
    version: '2',
    imageUrl: `${BASE_URL}/og-image.png`,
    button: {
      title: '🟣 Open ZoraMint',
      action: {
        type: 'launch_frame',
        name: 'ZoraMint',
        url: BASE_URL,
        splashImageUrl: `${BASE_URL}/splash.png`,
        splashBackgroundColor: '#0a0a0f',
      },
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="fc:frame" content={JSON.stringify(miniAppEmbed)} />
        <meta property="og:title" content="ZoraMint — Swap Creator Coins on Base" />
        <meta property="og:description" content="Discover and swap Zora creator coins on Base with Farcaster profiles." />
        <meta property="og:image" content={`${BASE_URL}/og-image.png`} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
