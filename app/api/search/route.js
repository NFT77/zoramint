// app/api/search/route.js
import { NextResponse } from 'next/server';
import { unifiedSearch } from '@/lib/api/zora';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const results = await unifiedSearch(query, 20);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}