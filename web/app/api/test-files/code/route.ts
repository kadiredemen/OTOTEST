import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TESTS_GENERATED_DIR } from '@/lib/paths';

export const dynamic = 'force-dynamic';

type SaveFile = {
  path: string;
  content: string;
};

function resolveGeneratedSpec(filePath: string) {
  const absPath = path.resolve(filePath);
  const testsDir = path.resolve(TESTS_GENERATED_DIR);

  if (!absPath.startsWith(testsDir + path.sep)) {
    throw new Error(`Test dosyasi generated klasoru disinda: ${filePath}`);
  }
  if (!absPath.endsWith('.spec.ts')) {
    throw new Error(`Sadece .spec.ts dosyalari desteklenir: ${filePath}`);
  }

  return absPath;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files: string[] = Array.isArray(body?.files) ? body.files : [];

    if (files.length === 0) {
      return NextResponse.json({ error: 'files zorunludur.' }, { status: 400 });
    }

    const result = files.map((filePath) => {
      const absPath = resolveGeneratedSpec(filePath);
      if (!fs.existsSync(absPath)) {
        throw new Error(`Test dosyasi bulunamadi: ${filePath}`);
      }

      const stat = fs.statSync(absPath);
      return {
        path: absPath,
        name: path.basename(absPath),
        content: fs.readFileSync(absPath, 'utf8'),
        modifiedAt: stat.mtime.toISOString(),
      };
    });

    return NextResponse.json({ files: result });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const files: SaveFile[] = Array.isArray(body?.files) ? body.files : [];

    if (files.length === 0) {
      return NextResponse.json({ error: 'files zorunludur.' }, { status: 400 });
    }

    const saved = files.map((file) => {
      const absPath = resolveGeneratedSpec(file.path);
      fs.writeFileSync(absPath, file.content, 'utf8');
      const stat = fs.statSync(absPath);

      return {
        path: absPath,
        name: path.basename(absPath),
        sizeKB: Math.round(stat.size / 1024 * 10) / 10,
        modifiedAt: stat.mtime.toISOString(),
      };
    });

    return NextResponse.json({ saved });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
