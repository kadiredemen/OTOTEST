import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/recorder-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getStatus());
}
