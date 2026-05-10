import { NextResponse } from 'next/server';
import { stopRecording } from '@/lib/recorder-manager';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = stopRecording();
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
