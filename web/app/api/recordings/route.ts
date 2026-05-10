import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { RECORDINGS_DIR } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      return NextResponse.json({ recordings: [] });
    }
    const files = fs.readdirSync(RECORDINGS_DIR).filter(
      (f) => f.endsWith('.json') && !f.endsWith('-normalized.json') && !f.endsWith('-plan.json')
    );

    const recordings = files.map((f) => {
      const name = path.basename(f, '.json');
      const rawPath = path.join(RECORDINGS_DIR, f);
      const stat = fs.statSync(rawPath);

      return {
        name,
        rawSizeKB: Math.round(stat.size / 1024),
        rawModifiedAt: stat.mtime.toISOString(),
      };
    });

    recordings.sort((a, b) => b.rawModifiedAt.localeCompare(a.rawModifiedAt));
    return NextResponse.json({ recordings });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
