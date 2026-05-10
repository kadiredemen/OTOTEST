import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { OTOTEST_ROOT, TESTS_GENERATED_DIR } from './paths';

export interface JobResult {
  filePath: string;
  name: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  durationMs: number;
  stdout: string;
  stderr: string;
}

export interface Job {
  jobId: string;
  status: 'running' | 'done';
  total: number;
  headed: boolean;
  results: JobResult[];
  startedAt: number;
}

// Module-level job store
const jobs = new Map<string, Job>();
const MAX_JOBS = 20;

export function startJob(files: string[], headed: boolean): string {
  const jobId = `job-${Date.now()}`;

  const job: Job = {
    jobId,
    status: 'running',
    total: files.length,
    headed,
    startedAt: Date.now(),
    results: files.map((f) => ({
      filePath: f,
      name: path.basename(f),
      status: 'queued',
      durationMs: 0,
      stdout: '',
      stderr: '',
    })),
  };

  // Evict oldest if at capacity
  if (jobs.size >= MAX_JOBS) {
    const oldest = [...jobs.keys()][0];
    jobs.delete(oldest);
  }

  jobs.set(jobId, job);
  runJob(job);
  return jobId;
}

async function runJob(job: Job) {
  for (const result of job.results) {
    result.status = 'running';
    const t0 = Date.now();
    try {
      const { stdout, stderr } = await runPlaywright(result.filePath, job.headed);
      result.status = 'success';
      result.stdout = stdout;
      result.stderr = stderr;
    } catch (e: unknown) {
      result.status = 'failed';
      const err = e as { stdout?: string; stderr?: string; message?: string };
      result.stdout = err.stdout || '';
      result.stderr = err.stderr || err.message || 'Bilinmeyen hata';
    }
    result.durationMs = Date.now() - t0;
  }
  job.status = 'done';
}

function runPlaywright(filePath: string, headed: boolean): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const absPath = path.resolve(filePath);
    const testsDir = path.resolve(TESTS_GENERATED_DIR);
    if (!absPath.startsWith(testsDir + path.sep)) {
      reject(new Error(`Test dosyasi generated klasoru disinda: ${filePath}`));
      return;
    }
    if (!fs.existsSync(absPath)) {
      reject(new Error(`Test dosyasi bulunamadi: ${filePath}`));
      return;
    }

    const relativeSpec = path.relative(OTOTEST_ROOT, absPath).replace(/\\/g, '/');
    const pwCli = path.join(OTOTEST_ROOT, 'node_modules', 'playwright', 'cli.js');
    const args = [pwCli, 'test', relativeSpec, '--project=chromium'];
    if (headed) args.push('--headed');

    const proc = spawn(process.execPath, args, {
      cwd: OTOTEST_ROOT,
      env: { ...process.env },
      windowsHide: false,
    });

    let stdout = `Command: node ${args.join(' ')}\n`;
    let stderr = '';

    proc.stdout?.setEncoding('utf8');
    proc.stdout?.on('data', (d: string) => { stdout += d; if (stdout.length > 80000) stdout = stdout.slice(-80000); });

    proc.stderr?.setEncoding('utf8');
    proc.stderr?.on('data', (d: string) => { stderr += d; if (stderr.length > 80000) stderr = stderr.slice(-80000); });

    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error(`exit ${code}`), { stdout, stderr }));
    });

    proc.on('error', (err) => reject(err));
  });
}

export function getJob(jobId: string): Job | null {
  return jobs.get(jobId) ?? null;
}
