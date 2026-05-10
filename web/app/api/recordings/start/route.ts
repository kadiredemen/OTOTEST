import { NextRequest, NextResponse } from 'next/server';
import { startRecording } from '@/lib/recorder-manager';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const testName = String(body?.testName || '').trim();
    if (!testName) return NextResponse.json({ error: 'Test adı zorunludur.' }, { status: 400 });
    const result = startRecording(testName);
    return NextResponse.json(result, { status: 202 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
