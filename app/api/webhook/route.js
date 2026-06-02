import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('ZoraMint webhook:', JSON.stringify(body).slice(0, 200));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
