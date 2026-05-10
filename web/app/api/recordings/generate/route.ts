import { NextRequest, NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { RECORDINGS_DIR, LOGS_DIR, NORMALIZER_SCRIPT, PLANNER_SCRIPT, BUILDER_SCRIPT, OTOTEST_ROOT } from '@/lib/paths';

export const dynamic = 'force-dynamic';

const AI_ENV_KEYS = new Set([
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'OTOTEST_AI_PLANNER',
  'OTOTEST_AI_PROVIDER',
  'OTOTEST_AI_MODEL',
]);

type StepLogResult = {
  ok: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  error?: string;
};

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeName(name: string) {
  return name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'recording';
}

function appendLog(logPath: string, line = '') {
  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
}

function loadRootAiEnv() {
  const envPath = path.join(OTOTEST_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!AI_ENV_KEYS.has(key)) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function aiPlannerEnabled() {
  if (process.env.OTOTEST_AI_PLANNER === '0') return false;
  if (process.env.OTOTEST_AI_PLANNER === '1') return true;
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

function currentAiProvider() {
  return process.env.OTOTEST_AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');
}

function currentAiModel() {
  return process.env.OTOTEST_AI_MODEL ||
    process.env.GEMINI_MODEL ||
    process.env.OPENAI_MODEL ||
    '(default)';
}

function appendBlock(logPath: string, title: string, content: string) {
  if (!content.trim()) return;
  appendLog(logPath, `--- ${title} ---`);
  appendLog(logPath, content.trimEnd());
}

function displayArg(arg: string) {
  return path.isAbsolute(arg) ? path.relative(OTOTEST_ROOT, arg) : arg;
}

function runLoggedStep(logPath: string, label: string, script: string, args: string[], timeout: number): StepLogResult {
  const started = Date.now();
  appendLog(logPath, `[${new Date().toISOString()}] START ${label}`);
  appendLog(logPath, `command=node ${path.relative(OTOTEST_ROOT, script)} ${args.map(displayArg).join(' ')}`);

  try {
    const stdout = execFileSync('node', [script, ...args], {
      cwd: OTOTEST_ROOT,
      timeout,
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const durationMs = Date.now() - started;
    appendBlock(logPath, `${label} stdout`, stdout);
    appendLog(logPath, `[${new Date().toISOString()}] OK ${label} durationMs=${durationMs}`);
    return { ok: true, durationMs, stdout, stderr: '' };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException & { stdout?: string | Buffer; stderr?: string | Buffer };
    const stdout = Buffer.isBuffer(err.stdout) ? err.stdout.toString('utf8') : String(err.stdout || '');
    const stderr = Buffer.isBuffer(err.stderr) ? err.stderr.toString('utf8') : String(err.stderr || '');
    const durationMs = Date.now() - started;
    appendBlock(logPath, `${label} stdout`, stdout);
    appendBlock(logPath, `${label} stderr`, stderr);
    appendLog(logPath, `[${new Date().toISOString()}] FAIL ${label} durationMs=${durationMs}`);
    appendLog(logPath, `error=${err.message || String(e)}`);
    return { ok: false, durationMs, stdout, stderr, error: err.message || String(e) };
  }
}

function readPlanMeta(planPath: string) {
  if (!fs.existsSync(planPath)) return null;
  try {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    return {
      planner: plan.planner || null,
      flow: plan.flow || null,
      operationCount: Array.isArray(plan.operations) ? plan.operations.length : 0,
      operations: Array.isArray(plan.operations) ? plan.operations.map((op: { op?: string }) => op.op).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    loadRootAiEnv();

    const body = await req.json();
    const names: string[] = Array.isArray(body?.testNames)
      ? body.testNames
      : body?.testName
        ? [body.testName]
        : [];

    if (names.length === 0) {
      return NextResponse.json({ error: 'testName veya testNames zorunludur.' }, { status: 400 });
    }

    const results: { name: string; ok: boolean; error?: string; logPath?: string }[] = [];
    const generateLogDir = path.join(LOGS_DIR, 'generate');
    fs.mkdirSync(generateLogDir, { recursive: true });

    for (const name of names) {
      const logPath = path.join(generateLogDir, `${safeName(name)}-${timestampForFile()}.log`);
      appendLog(logPath, `recording=${name}`);
      appendLog(logPath, `startedAt=${new Date().toISOString()}`);
      appendLog(logPath, `root=${OTOTEST_ROOT}`);
      appendLog(logPath, `aiPlanner=${aiPlannerEnabled() ? 'enabled' : 'disabled'}`);
      appendLog(logPath, `aiProvider=${currentAiProvider()}`);
      appendLog(logPath, `aiModel=${currentAiModel()}`);

      const rawPath = path.join(RECORDINGS_DIR, `${name}.json`);
      if (!fs.existsSync(rawPath)) {
        appendLog(logPath, 'FAIL raw recording not found');
        results.push({ name, ok: false, error: 'Kayıt dosyası bulunamadı.', logPath: path.relative(OTOTEST_ROOT, logPath) });
        continue;
      }

      // 1) Normalize
      const normalize = runLoggedStep(logPath, 'normalize', NORMALIZER_SCRIPT, [rawPath], 15000);
      if (!normalize.ok) {
        results.push({ name, ok: false, error: (normalize.error || 'Normalize hatası').slice(0, 300), logPath: path.relative(OTOTEST_ROOT, logPath) });
        continue;
      }

      // 2) Produce a constrained test intent plan
      const normalizedPath = path.join(RECORDINGS_DIR, `${name}-normalized.json`);
      const planPath = path.join(RECORDINGS_DIR, `${name}-plan.json`);
      const plannerArgs = aiPlannerEnabled() ? [normalizedPath, '--ai'] : [normalizedPath];
      const planner = runLoggedStep(logPath, 'planner', PLANNER_SCRIPT, plannerArgs, 30000);
      const planMeta = readPlanMeta(planPath);
      if (planMeta) appendLog(logPath, `planMeta=${JSON.stringify(planMeta)}`);
      if (!planner.ok) {
        results.push({ name, ok: false, error: (planner.error || 'Planner hatası').slice(0, 300), logPath: path.relative(OTOTEST_ROOT, logPath) });
        continue;
      }

      // 3) Build POM + Spec from the validated plan
      const builder = runLoggedStep(logPath, 'builder', BUILDER_SCRIPT, ['--all'], 15000);
      if (!builder.ok) {
        results.push({ name, ok: false, error: (builder.error || 'Builder hatası').slice(0, 300), logPath: path.relative(OTOTEST_ROOT, logPath) });
        continue;
      }

      appendLog(logPath, `finishedAt=${new Date().toISOString()}`);
      results.push({ name, ok: true, logPath: path.relative(OTOTEST_ROOT, logPath) });
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json({ results }, { status: allOk ? 200 : 207 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
