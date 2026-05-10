import { NextRequest, NextResponse } from 'next/server';
import { startJob } from '@/lib/test-runner';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files: string[] = Array.isArray(body?.files) ? body.files : [];
    const headed: boolean = body?.headed === true;

    if (files.length === 0) {
      return NextResponse.json({ error: 'files zorunludur.' }, { status: 400 });
    }

    const jobId = startJob(files, headed);
    return NextResponse.json({ jobId, total: files.length, headed });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
