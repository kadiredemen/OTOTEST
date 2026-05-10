import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TESTS_GENERATED_DIR } from '@/lib/paths';

export const dynamic = 'force-dynamic';

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

export async function GET() {
  try {
    const allFiles = walk(TESTS_GENERATED_DIR).filter((f) => f.endsWith('.spec.ts'));

    const files = allFiles.map((abs) => {
      const stat = fs.statSync(abs);
      return {
        path: abs,
        name: path.basename(abs),
        sizeKB: Math.round(stat.size / 1024 * 10) / 10,
        modifiedAt: stat.mtime.toISOString(),
      };
    });

    files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return NextResponse.json({ files });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
