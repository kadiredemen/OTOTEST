'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface TestFile {
  path: string;
  name: string;
  sizeKB: number;
  modifiedAt: string;
}

interface JobResult {
  filePath: string;
  name: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  durationMs: number;
  stdout: string;
  stderr: string;
}

interface Job {
  jobId: string;
  status: 'running' | 'done';
  total: number;
  headed: boolean;
  results: JobResult[];
  startedAt: number;
}

interface Toast { id: number; msg: string; type: 'success' | 'error' }

interface CodeFile {
  path: string;
  name: string;
  content: string;
  modifiedAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number) {
  if (ms === 0) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function StatusBadge({ status }: { status: JobResult['status'] }) {
  if (status === 'success') return <span className="badge badge-success">✓ Başarılı</span>;
  if (status === 'failed') return <span className="badge badge-error">✗ Başarısız</span>;
  if (status === 'running') return (
    <span className="badge badge-info">
      <svg className="spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
      Çalışıyor
    </span>
  );
  return <span className="badge badge-muted">Bekliyor</span>;
}

export default function TestFilesPage() {
  const [files, setFiles] = useState<TestFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [headed, setHeaded] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [codeLoading, setCodeLoading] = useState(false);
  const [editingCode, setEditingCode] = useState<Set<string>>(new Set());
  const [savingCode, setSavingCode] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [running, setRunning] = useState(false);
  const toastIdRef = useRef(0);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/test-files');
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch { /* ignore */ }
  }, []);

  const pollJob = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/test-files/jobs/${id}`);
      if (!res.ok) return;
      const data: Job = await res.json();
      setJob(data);
      if (data.status === 'done') {
        setRunning(false);
        const failed = data.results.filter((r) => r.status === 'failed').length;
        const success = data.results.filter((r) => r.status === 'success').length;
        if (failed > 0) toast(`${success} başarılı, ${failed} başarısız`, 'error');
        else toast(`${success} test başarıyla tamamlandı`, 'success');
      }
    } catch { /* ignore */ }
  }, [toast]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  useEffect(() => {
    if (!jobId || !running) return;
    const id = setInterval(() => pollJob(jobId), 1200);
    return () => clearInterval(id);
  }, [jobId, running, pollJob]);

  const selectedFiles = files.filter((f) => selected.has(f.path));
  const selectedPaths = selectedFiles.map((f) => f.path);
  const selectedKey = selectedPaths.join('|');

  const loadSelectedCode = useCallback(async (paths: string[]) => {
    if (paths.length === 0) {
      setCodeFiles([]);
      setCodeDrafts({});
      setEditingCode(new Set());
      return;
    }

    setCodeLoading(true);
    try {
      const res = await fetch('/api/test-files/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: paths }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Kodlar okunamadı.', 'error');
        return;
      }

      const loaded: CodeFile[] = data.files ?? [];
      setCodeFiles(loaded);
      setCodeDrafts(Object.fromEntries(loaded.map((file) => [file.path, file.content])));
      setEditingCode(new Set());
    } catch {
      toast('Kodlar okunamadı.', 'error');
    } finally {
      setCodeLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSelectedCode(selectedPaths);
  }, [selectedKey, loadSelectedCode]);

  async function runSelected() {
    const filePaths = files.filter((f) => selected.has(f.path)).map((f) => f.path);
    if (filePaths.length === 0) return;
    setRunning(true);
    setJob(null);
    try {
      const res = await fetch('/api/test-files/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filePaths, headed }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error, 'error'); setRunning(false); return; }
      setJobId(data.jobId);
    } catch {
      toast('Test başlatılamadı.', 'error');
      setRunning(false);
    }
  }

  async function runAll() {
    const filePaths = files.map((f) => f.path);
    if (filePaths.length === 0) return;
    setRunning(true);
    setJob(null);
    try {
      const res = await fetch('/api/test-files/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filePaths, headed }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error, 'error'); setRunning(false); return; }
      setJobId(data.jobId);
    } catch {
      toast('Test başlatılamadı.', 'error');
      setRunning(false);
    }
  }

  function toggleAll() {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.path)));
  }

  function toggle(path: string) {
    setSelected((s) => { const n = new Set(s); n.has(path) ? n.delete(path) : n.add(path); return n; });
  }

  function updateDraft(path: string, content: string) {
    setCodeDrafts((drafts) => ({ ...drafts, [path]: content }));
  }

  async function copyCode(file: CodeFile) {
    try {
      await navigator.clipboard.writeText(codeDrafts[file.path] ?? file.content);
      toast(`${file.name} kopyalandı.`, 'success');
    } catch {
      toast('Kod kopyalanamadı.', 'error');
    }
  }

  function editCode(filePath: string) {
    setEditingCode((current) => {
      const next = new Set(current);
      next.add(filePath);
      return next;
    });
  }

  function cancelEdit(file: CodeFile) {
    setCodeDrafts((drafts) => ({ ...drafts, [file.path]: file.content }));
    setEditingCode((current) => {
      const next = new Set(current);
      next.delete(file.path);
      return next;
    });
  }

  async function saveCode(file: CodeFile) {
    setSavingCode((current) => {
      const next = new Set(current);
      next.add(file.path);
      return next;
    });
    try {
      const payload = [{
        path: file.path,
        content: codeDrafts[file.path] ?? file.content,
      }];
      const res = await fetch('/api/test-files/code', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Kod kaydedilemedi.', 'error');
        return;
      }

      toast(`${file.name} kaydedildi.`, 'success');
      setEditingCode((current) => {
        const next = new Set(current);
        next.delete(file.path);
        return next;
      });
      await loadFiles();
      await loadSelectedCode(payload.map((file) => file.path));
    } catch {
      toast('Kod kaydedilemedi.', 'error');
    } finally {
      setSavingCode((current) => {
        const next = new Set(current);
        next.delete(file.path);
        return next;
      });
    }
  }

  // Merge job results into files for display
  const resultMap = new Map<string, JobResult>();
  job?.results.forEach((r) => resultMap.set(r.filePath, r));

  const completedCount = job?.results.filter((r) => ['success', 'failed'].includes(r.status)).length ?? 0;
  const successCount = job?.results.filter((r) => r.status === 'success').length ?? 0;
  const failedCount = job?.results.filter((r) => r.status === 'failed').length ?? 0;
  const progress = job ? Math.round((completedCount / job.total) * 100) : 0;
  const completedResults = job?.results.filter((r) => r.status === 'success' || r.status === 'failed') ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Test Dosyaları</div>
          <div className="page-subtitle">{files.length} spec dosyası</div>
        </div>
        <div className="toolbar">
          <button className="btn btn-ghost" onClick={loadFiles} title="Yenile">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Yenile
          </button>
          <div className="separator" />
          {/* Headed toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <label className="toggle">
              <input type="checkbox" checked={headed} onChange={(e) => setHeaded(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
            Headed
          </label>
          <div className="separator" />
          {selected.size > 0 && (
            <button className="btn btn-secondary" onClick={runSelected} disabled={running}>
              {running
                ? <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              }
              {selected.size} Seçiliyi Çalıştır
            </button>
          )}
          <button className="btn btn-primary" onClick={runAll} disabled={running || files.length === 0}>
            {running
              ? <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            }
            Tümünü Çalıştır
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="test-files-body">

        {/* Job progress */}
        {job && (
          <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {job.status === 'running' ? 'Çalışıyor...' : 'Tamamlandı'}
                </span>
                <span style={{ color: 'var(--success)' }}>{successCount} başarılı</span>
                {failedCount > 0 && <span style={{ color: 'var(--error)' }}>{failedCount} başarısız</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{completedCount}/{job.total}</span>
                {completedResults.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setResultsOpen(true)}>
                    Sonuçları Gör
                  </button>
                )}
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Toolbar */}
        {files.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
              {selected.size === files.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
            </button>
            {selected.size > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.size} seçili</span>
            )}
          </div>
        )}

        <div className="test-files-split">
          {/* Files table */}
          <div className="test-files-list-pane">
            {files.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                <div>Test dosyası yok</div>
                <div style={{ fontSize: 12 }}>Kayıtlar ekranından üretim yapın</div>
              </div>
            ) : (
              <div className="card test-files-panel">
                <div className="table-wrapper test-files-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <input type="checkbox" checked={selected.size === files.length && files.length > 0} onChange={toggleAll} />
                        </th>
                        <th>Dosya</th>
                        <th>Boyut</th>
                        <th>Güncelleme</th>
                        {job && <th style={{ textAlign: 'center' }}>Durum</th>}
                        {job && <th style={{ textAlign: 'right' }}>Süre</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => {
                        const result = resultMap.get(file.path);
                        return (
                          <tr key={file.path}>
                            <td><input type="checkbox" checked={selected.has(file.path)} onChange={() => toggle(file.path)} /></td>
                            <td>
                              <span className="code-tag">{file.name}</span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{file.sizeKB} KB</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(file.modifiedAt)}</td>
                            {job && <td style={{ textAlign: 'center' }}>{result ? <StatusBadge status={result.status} /> : <span className="badge badge-muted">—</span>}</td>}
                            {job && <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{result ? formatDuration(result.durationMs) : '—'}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="card test-code-panel">
            <div className="test-code-toolbar">
              <div>
                <div className="test-code-title">Kod Paneli</div>
                <div className="test-code-subtitle">
                  {selectedFiles.length === 0 ? 'Test seçin' : `${selectedFiles.length} test seçili`}
                </div>
              </div>
            </div>

            <div className="test-code-scroll">
              {selectedFiles.length === 0 ? (
                <div className="test-code-empty">Kodları görmek için soldan bir veya daha fazla test seçin.</div>
              ) : codeLoading ? (
                <div className="test-code-empty">Kodlar yükleniyor...</div>
              ) : (
                codeFiles.map((file) => (
                  <section className="test-code-file" key={file.path}>
                    <div className="test-code-file-header">
                      <span className="code-tag">{file.name}</span>
                      <div className="test-code-file-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => copyCode(file)}>
                          Kopyala
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => editCode(file.path)} disabled={editingCode.has(file.path)}>
                          Düzenle
                        </button>
                        {editingCode.has(file.path) && (
                          <button className="btn btn-secondary btn-sm" onClick={() => cancelEdit(file)} disabled={savingCode.has(file.path)}>
                            İptal
                          </button>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={() => saveCode(file)} disabled={!editingCode.has(file.path) || savingCode.has(file.path)}>
                          {savingCode.has(file.path) && <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>}
                          Kaydet
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="code-editor"
                      value={codeDrafts[file.path] ?? file.content}
                      onChange={(event) => updateDraft(file.path, event.target.value)}
                      readOnly={!editingCode.has(file.path)}
                      spellCheck={false}
                    />
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {job && resultsOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setResultsOpen(false)}>
          <div className="modal-panel test-results-modal" role="dialog" aria-modal="true" aria-labelledby="test-results-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div id="test-results-title" className="modal-title">Test Sonuçları</div>
                <div className="modal-subtitle">{successCount} başarılı{failedCount > 0 ? `, ${failedCount} başarısız` : ''}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setResultsOpen(false)} title="Kapat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                Kapat
              </button>
            </div>
            <div className="test-results-modal-scroll">
              {completedResults.map((result) => (
                <details key={result.filePath} open={result.status === 'failed'}>
                  <summary>
                    <StatusBadge status={result.status} />
                    <span style={{ color: 'var(--text-primary)' }}>{result.name}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>{formatDuration(result.durationMs)}</span>
                  </summary>
                  {(result.stdout || result.stderr) && (
                    <div className="result-output">
                      {result.stderr && <div style={{ color: '#f87171' }}>{result.stderr}</div>}
                      {result.stdout && <div>{result.stdout}</div>}
                    </div>
                  )}
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="toast-area">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
