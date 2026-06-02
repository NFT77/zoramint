// lib/api/farcaster.js
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export function convertIpfsToHttp(url) {
  if (!url) return null;
  if (url.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  if (url.startsWith('/ipfs/')) return `https://ipfs.io/ipfs/${url.replace('/ipfs/', '')}`;
  return url;
}

export async function getUserByUsername(username) {
  if (!NEYNAR_API_KEY) return null;
  const clean = username.replace(/^@/, '').toLowerCase();
  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/user/by_username?username=${clean}`, {
      headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.user;
    if (!user) return null;
    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      bio: user.profile?.bio?.text || '',
      pfp_url: convertIpfsToHttp(user.pfp_url),
      followerCount: user.follower_count || 0,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
    };
  } catch (err) {
    return null;
  }
}

export async function getUserByAddress(address) {
  if (!NEYNAR_API_KEY) return null;
  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/user/by_verification?address=${address}`, {
      headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.result?.user || data.user;
    if (!user) return null;
    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      bio: user.profile?.bio?.text || '',
      pfp_url: convertIpfsToHttp(user.pfp_url),
      followerCount: user.follower_count || 0,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
    };
  } catch (err) {
    return null;
  }
}

export async function searchFarcasterUsers(query, limit = 10) {
  if (!NEYNAR_API_KEY) return [];
  const clean = query.replace(/^@/, '').toLowerCase();
  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(clean)}&limit=${limit}`, {
      headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.result?.users || []).map(user => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      bio: user.profile?.bio?.text || '',
      pfp_url: convertIpfsToHttp(user.pfp_url),
      followerCount: user.follower_count || 0,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
    }));
  } catch (err) {
    return [];
  }
}