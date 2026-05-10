import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { RECORDINGS_DIR, PAGES_DIR, TESTS_GENERATED_DIR } from '@/lib/paths';

export const dynamic = 'force-dynamic';

function toPascalCase(str: string) {
  return str.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function tryRemove(p: string) {
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* ignore */ }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const names: string[] = Array.isArray(body?.testNames) ? body.testNames : [];
    if (names.length === 0) return NextResponse.json({ error: 'testNames zorunludur.' }, { status: 400 });

    const removed: string[] = [];
    for (const name of names) {
      const norm = path.join(RECORDINGS_DIR, `${name}-normalized.json`);
      const plan = path.join(RECORDINGS_DIR, `${name}-plan.json`);
      const pom  = path.join(PAGES_DIR, `${toPascalCase(name)}Page.ts`);
      const spec = path.join(TESTS_GENERATED_DIR, `${name}.spec.ts`);
      [norm, plan, pom, spec].forEach((p) => { if (fs.existsSync(p)) { fs.unlinkSync(p); removed.push(p); } });
    }

    return NextResponse.json({ ok: true, removed: removed.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
