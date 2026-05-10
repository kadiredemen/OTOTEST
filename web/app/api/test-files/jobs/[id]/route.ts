import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/test-runner';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Job bulunamadı.' }, { status: 404 });
  return NextResponse.json(job);
}
