import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { RECORDINGS_DIR, RECORDER_SCRIPT } from './paths';

interface RecState {
  status: 'idle' | 'recording' | 'saved' | 'error';
  testName: string;
  message: string;
  startedAt: number;
  outputFile: string;
  lastLines: string[];
}

// Module-level singleton — persists across API requests in the same process
let activeProcess: ChildProcess | null = null;
let state: RecState = {
  status: 'idle',
  testName: '',
  message: '',
  startedAt: 0,
  outputFile: '',
  lastLines: [],
};

function slugify(name: string) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function pushLine(line: string) {
  state.lastLines = [...state.lastLines.slice(-19), line];
}

export function startRecording(testName: string) {
  if (state.status === 'recording') {
    throw new Error('Zaten kayıt devam ediyor.');
  }
  const slug = slugify(testName);
  if (!slug) throw new Error('Geçersiz test adı.');

  const outputFile = path.join(RECORDINGS_DIR, `${slug}.json`);

  state = {
    status: 'recording',
    testName: slug,
    message: 'Tarayıcı açılıyor...',
    startedAt: Date.now(),
    outputFile,
    lastLines: [],
  };

  activeProcess = spawn('node', [RECORDER_SCRIPT, `--test-name=${slug}`, `--file=${outputFile}`], {
    cwd: path.dirname(RECORDER_SCRIPT),
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
  });

  activeProcess.stdout?.setEncoding('utf8');
  activeProcess.stdout?.on('data', (chunk: string) => {
    for (const line of chunk.split('\n').filter(Boolean)) {
      pushLine(line);
      if (state.status === 'recording') state.message = line.slice(0, 120);
    }
  });

  activeProcess.stderr?.setEncoding('utf8');
  activeProcess.stderr?.on('data', (chunk: string) => {
    for (const line of chunk.split('\n').filter(Boolean)) pushLine('[ERR] ' + line);
  });

  activeProcess.on('close', (code: number | null) => {
    state.status = code === 0 ? 'saved' : 'error';
    state.message = code === 0 ? `Kayıt tamamlandı: ${slug}.json` : `Hata (exit ${code})`;
    activeProcess = null;
  });

  activeProcess.on('error', (err: Error) => {
    state.status = 'error';
    state.message = err.message;
    activeProcess = null;
  });

  return { ok: true, testName: slug, outputFile };
}

export function stopRecording() {
  if (!activeProcess || state.status !== 'recording') {
    throw new Error('Aktif kayıt yok.');
  }
  // Windows: stdin üzerinden STOP komutu
  try {
    activeProcess.stdin?.write('STOP\n');
    activeProcess.stdin?.end();
  } catch {
    activeProcess.kill('SIGTERM');
  }
  return { ok: true };
}

export function clearStatus() {
  if (state.status === 'recording') throw new Error('Kayıt devam ediyor, önce durdurun.');
  state = { status: 'idle', testName: '', message: '', startedAt: 0, outputFile: '', lastLines: [] };
  return { ok: true };
}

export function getStatus(): RecState {
  return { ...state };
}
