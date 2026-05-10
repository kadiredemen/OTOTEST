'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Recording {
  name: string;
  rawSizeKB: number;
  rawModifiedAt: string;
}

interface RecStatus {
  status: 'idle' | 'recording' | 'saved' | 'error';
  testName: string;
  message: string;
  startedAt: number;
}

interface Toast { id: number; msg: string; type: 'success' | 'error' }

type GenerationState = {
  status: 'success' | 'failed';
  message?: string;
};

type GenerateResult = {
  ok: boolean;
  name: string;
  error?: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(startedAt: number) {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<RecStatus>({ status: 'idle', testName: '', message: '', startedAt: 0 });
  const [newName, setNewName] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [generationResults, setGenerationResults] = useState<Record<string, GenerationState>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [elapsed, setElapsed] = useState('00:00');
  const toastIdRef = useRef(0);
  const prevStatusRef = useRef<string>('idle');

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const loadRecordings = useCallback(async () => {
    try {
      const res = await fetch('/api/recordings');
      const data = await res.json();
      setRecordings(data.recordings ?? []);
    } catch { /* ignore */ }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/recordings/status');
      const data: RecStatus = await res.json();
      setStatus(data);
      if (prevStatusRef.current === 'recording' && data.status === 'saved') {
        toast(`Kayıt tamamlandı: ${data.testName}.json`, 'success');
        loadRecordings();
      }
      if (prevStatusRef.current === 'recording' && data.status === 'error') {
        toast('Kayıt sırasında hata oluştu.', 'error');
      }
      prevStatusRef.current = data.status;
    } catch { /* ignore */ }
  }, [toast, loadRecordings]);

  // Initial load
  useEffect(() => {
    loadRecordings();
    pollStatus();
  }, [loadRecordings, pollStatus]);

  // Status polling
  useEffect(() => {
    const id = setInterval(pollStatus, 1500);
    return () => clearInterval(id);
  }, [pollStatus]);

  // Elapsed timer
  useEffect(() => {
    if (status.status !== 'recording') { setElapsed('00:00'); return; }
    const id = setInterval(() => setElapsed(formatElapsed(status.startedAt)), 1000);
    return () => clearInterval(id);
  }, [status.status, status.startedAt]);

  async function startRecording() {
    if (!newName.trim()) return;
    setLoadingRec(true);
    try {
      const res = await fetch('/api/recordings/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testName: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error, 'error'); return; }
      setNewName('');
      toast('Kayıt başlatıldı. ERP tarayıcısında işlemi gerçekleştirin.', 'success');
    } finally {
      setLoadingRec(false);
    }
  }

  async function stopRecording() {
    setLoadingRec(true);
    try {
      const res = await fetch('/api/recordings/stop', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast(data.error, 'error'); return; }
      toast('Durdurma komutu gönderildi...', 'success');
    } finally {
      setLoadingRec(false);
    }
  }

  async function generate(names: string[]) {
    setGenerating((s) => { const n = new Set(s); names.forEach((x) => n.add(x)); return n; });
    setGenerationResults((current) => {
      const next = { ...current };
      names.forEach((name) => { delete next[name]; });
      return next;
    });
    try {
      const res = await fetch('/api/recordings/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testNames: names }),
      });
      const data = await res.json();
      const results: GenerateResult[] = data.results ?? [];
      const failed = results.filter((r) => !r.ok);
      const successful = results.filter((r) => r.ok).map((r) => r.name);

      setGenerationResults((current) => {
        const next = { ...current };
        results.forEach((result) => {
          next[result.name] = result.ok
            ? { status: 'success' }
            : { status: 'failed', message: result.error || 'Üretim hatası' };
        });
        return next;
      });

      if (failed.length > 0) toast(`${failed.length} hata: ${failed[0].error}`, 'error');
      else toast(`${names.length} kayıt üretildi.`, 'success');

      setSelected((current) => {
        const next = new Set(current);
        successful.forEach((name) => next.delete(name));
        return next;
      });

      await loadRecordings();
    } catch {
      toast('Üretim sırasında hata.', 'error');
      setGenerationResults((current) => {
        const next = { ...current };
        names.forEach((name) => {
          next[name] = { status: 'failed', message: 'Üretim sırasında hata.' };
        });
        return next;
      });
    } finally {
      setGenerating((s) => { const n = new Set(s); names.forEach((x) => n.delete(x)); return n; });
    }
  }

  async function clearGenerated(names: string[]) {
    try {
      const res = await fetch('/api/recordings/clear-generated', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testNames: names }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error, 'error'); return; }
      toast(`${data.removed} dosya silindi.`, 'success');
      await loadRecordings();
      setSelected(new Set());
      setGenerationResults((current) => {
        const next = { ...current };
        names.forEach((name) => { delete next[name]; });
        return next;
      });
    } catch {
      toast('Silme sırasında hata.', 'error');
    }
  }

  function toggleAll() {
    if (selected.size === recordings.length) setSelected(new Set());
    else setSelected(new Set(recordings.map((r) => r.name)));
  }

  function toggle(name: string) {
    setSelected((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }

  const isRecording = status.status === 'recording';
  const selectedArr = [...selected];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Kayıtlar</div>
          <div className="page-subtitle">{recordings.length} kayıt mevcut</div>
        </div>
        <button className="btn btn-ghost" onClick={loadRecordings} title="Yenile">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          Yenile
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* New Recording Card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yeni Kayıt</div>
            <input
              className="input"
              placeholder="siparis-alis, depo-giris-islemi..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isRecording && startRecording()}
              disabled={isRecording}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 22, flexShrink: 0 }}
            onClick={startRecording}
            disabled={isRecording || !newName.trim() || loadingRec}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5" />
            </svg>
            Kayıt Başlat
          </button>
        </div>

        {/* Active Recording Banner */}
        {isRecording && (
          <div className="rec-indicator">
            <div className="rec-dot" />
            <div style={{ flex: 1 }}>
              <span style={{ color: '#fca5a5', fontWeight: 600 }}>KAYIT DEVAM EDİYOR</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 10 }}>{status.testName}</span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontVariantNumeric: 'tabular-nums', marginRight: 12 }}>{elapsed}</span>
            <button className="btn btn-record btn-sm" onClick={stopRecording} disabled={loadingRec}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" /></svg>
              Kaydı Durdur
            </button>
          </div>
        )}

        {/* Status message for saved/error */}
        {(status.status === 'saved' || status.status === 'error') && status.message && (
          <div className={`card ${status.status === 'error' ? 'badge-error' : ''}`} style={{ fontSize: 13, padding: '10px 14px', borderColor: status.status === 'error' ? '#7f1d1d50' : '#14532d50', background: status.status === 'error' ? '#7f1d1d15' : '#14532d15' }}>
            {status.status === 'saved' ? '✓ ' : '✗ '}{status.message}
          </div>
        )}

        {/* Bottom toolbar */}
        {recordings.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
              {selected.size === recordings.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
            </button>
            {selectedArr.length > 0 && (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedArr.length} seçili</span>
                <div className="separator" />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => generate(selectedArr)}
                  disabled={generating.size > 0}
                >
                  {generating.size > 0 && <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>}
                  Seçilileri Üret
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => clearGenerated(selectedArr)}>
                  Üretimleri Sil
                </button>
              </>
            )}
          </div>
        )}

        {/* Table */}
        {recordings.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>
            <div>Henüz kayıt yok</div>
            <div style={{ fontSize: 12 }}>Yukarıdan bir kayıt başlatın</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={selected.size === recordings.length && recordings.length > 0} onChange={toggleAll} />
                    </th>
                    <th>Ad</th>
                    <th>Boyut</th>
                    <th>Tarih</th>
                    <th style={{ textAlign: 'center' }}>Durum</th>
                    <th style={{ textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {recordings.map((rec) => {
                    const result = generationResults[rec.name];
                    return (
                      <tr key={rec.name}>
                        <td>
                          <input type="checkbox" checked={selected.has(rec.name)} onChange={() => toggle(rec.name)} />
                        </td>
                        <td>
                          <span className="code-tag">{rec.name}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{rec.rawSizeKB} KB</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(rec.rawModifiedAt)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {generating.has(rec.name) ? (
                            <span className="badge badge-info">
                              <svg className="spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
                              Üretiliyor
                            </span>
                          ) : result?.status === 'success' ? (
                            <span className="badge badge-success">Başarılı</span>
                          ) : result?.status === 'failed' ? (
                            <span className="badge badge-error" title={result.message}>Başarısız</span>
                          ) : (
                            <span className="badge badge-muted">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => generate([rec.name])}
                              disabled={generating.has(rec.name)}
                              title="Normalize + Plan + POM + Spec üret"
                            >
                              {generating.has(rec.name)
                                ? <svg className="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                              }
                              Üret
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => clearGenerated([rec.name])}
                              title="Üretilmiş dosyaları sil"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <div className="toast-area">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
