'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, AudioLines, Loader2, AlertTriangle, Building2, Upload, Mic, Square, Pause, Play, FileAudio } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Client } from '@/types/database';
import { useToast } from '@/components/CustomToast';
import { transcribeMeetingAudio, organizeMeetingNotes, extractMeetingTitleFromMarkdown } from '@/lib/notesAudio';
import { markdownToTiptapJson } from '@/lib/markdownToTiptapJson';
import { useMeetingRecorder } from '@/hooks/useMeetingRecorder';
import { OrganizeMode, ORGANIZE_MODE_LABELS, ORGANIZE_MODE_DESCRIPTIONS, DEFAULT_ORGANIZE_MODE } from '@/lib/organizeModes';

type Step = 'idle' | 'transcribing' | 'organizing' | 'error';
type Mode = 'upload' | 'record';

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioNotaPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const recorder = useMeetingRecorder();

  const [mode, setMode] = useState<Mode>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'nome_fantasia'>[]>([]);
  const [clientId, setClientId] = useState('');
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>(DEFAULT_ORGANIZE_MODE);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progressLabel, setProgressLabel] = useState('');

  // Evita perder a gravação se a pessoa fechar/recarregar a aba sem querer.
  useEffect(() => {
    const isRecording = recorder.status === 'recording' || recorder.status === 'paused';
    if (!isRecording) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [recorder.status]);

  // Deixa o progresso visível no título da aba, já que o processo continua
  // rodando normalmente mesmo se o usuário trocar de aba enquanto espera.
  useEffect(() => {
    const originalTitle = document.title;
    document.title = progressLabel ? `⏳ ${progressLabel} — Notas` : originalTitle;
    return () => { document.title = originalTitle; };
  }, [progressLabel]);

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, nome_fantasia, sequential_id')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => { if (data) setClients(data as any); });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setErrorMsg('');
    setStep('idle');
  };

  const handleStopRecording = async () => {
    const recordedFile = await recorder.stop();
    setFile(recordedFile);
    setErrorMsg('');
    setStep('idle');
  };

  const switchMode = (next: Mode) => {
    if (isProcessing) return;
    if (recorder.status === 'recording' || recorder.status === 'paused') return;
    recorder.reset();
    setFile(null);
    setErrorMsg('');
    setStep('idle');
    setMode(next);
  };

  const handleGenerate = async () => {
    if (!file || !currentUser) return;
    try {
      setStep('transcribing');
      setProgressLabel('Preparando áudio...');
      const transcript = await transcribeMeetingAudio(file, currentUser.id, (current, total) => {
        setProgressLabel(total > 1 ? `Transcrevendo parte ${current} de ${total}...` : 'Transcrevendo com IA...');
      });

      setStep('organizing');
      setProgressLabel('Organizando notas com IA...');
      const markdown = await organizeMeetingNotes(transcript, organizeMode);

      const title = extractMeetingTitleFromMarkdown(markdown) || `Reunião — ${new Date().toLocaleDateString('pt-BR')}`;
      const content = markdownToTiptapJson(markdown);

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: currentUser.id,
          title,
          content,
          date: new Date().toISOString().split('T')[0],
          subjects: [],
          shared_with: [],
          client_id: clientId || null,
          raw_transcript: transcript,
          transcribed_at: new Date().toISOString(),
          last_organized_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;
      showToast('Nota gerada a partir do áudio', 'success');
      router.replace(`/admin/notas/${data.id}`);
    } catch (err: any) {
      console.error('Erro ao gerar nota a partir de áudio:', err);
      setStep('error');
      setErrorMsg(err.message || 'Erro inesperado.');
    }
  };

  const isProcessing = step === 'transcribing' || step === 'organizing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '560px', margin: '0 auto' }}
    >
      <div>
        <Link href="/admin/notas" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '16px' }}>
          <ArrowLeft size={15} /> Notas
        </Link>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '8px' }}>Gerar nota da áudio</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Envie o áudio de uma reunião: a IA transcreve e organiza automaticamente em tópicos, decisões e tarefas.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--color-surface-sunken)',
          borderRadius: '10px', padding: '4px', alignSelf: 'flex-start',
        }}>
          {([
            { key: 'upload' as const, label: 'Enviar arquivo', icon: Upload },
            { key: 'record' as const, label: 'Gravar reunião', icon: Mic },
          ]).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchMode(t.key)}
              disabled={isProcessing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                fontSize: '0.82rem', fontWeight: 500, cursor: isProcessing ? 'not-allowed' : 'pointer',
                background: mode === t.key ? 'var(--accent)' : 'transparent',
                color: mode === t.key ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {mode === 'upload' ? (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <AudioLines size={14} /> Arquivo de áudio
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isProcessing}
              style={{ width: '100%', background: 'var(--color-surface-sunken)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Arquivos grandes são divididos automaticamente em partes antes de transcrever.
            </p>
          </div>
        ) : (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <Mic size={14} /> Gravar reunião presencial
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Grava pelo microfone do computador — funciona para reunião presencial, na mesma sala. Não captura o áudio de chamadas online (Zoom, Meet etc.); pra isso, envie a gravação como arquivo.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'var(--color-surface-sunken)', borderRadius: '10px' }}>
              {recorder.status === 'idle' || recorder.status === 'error' ? (
                <button
                  type="button"
                  onClick={recorder.start}
                  disabled={isProcessing}
                  className="btn btn-accent"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Mic size={16} /> Iniciar gravação
                </button>
              ) : recorder.status === 'stopped' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <FileAudio size={20} color="var(--accent)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Gravação de {formatElapsed(recorder.elapsedSeconds)} pronta.
                  </span>
                  <button
                    type="button"
                    onClick={() => { recorder.reset(); setFile(null); }}
                    disabled={isProcessing}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Regravar
                  </button>
                </div>
              ) : (
                <>
                  <motion.div
                    animate={{ opacity: recorder.status === 'recording' ? [1, 0.3, 1] : 1 }}
                    transition={{ repeat: recorder.status === 'recording' ? Infinity : 0, duration: 1.4 }}
                    style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatElapsed(recorder.elapsedSeconds)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {recorder.status === 'paused' ? 'Pausado' : 'Gravando...'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {recorder.status === 'recording' ? (
                      <button type="button" onClick={recorder.pause} title="Pausar" style={{ background: 'var(--color-surface-canvas)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex' }}>
                        <Pause size={15} />
                      </button>
                    ) : (
                      <button type="button" onClick={recorder.resume} title="Retomar" style={{ background: 'var(--color-surface-canvas)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex' }}>
                        <Play size={15} />
                      </button>
                    )}
                    <button type="button" onClick={handleStopRecording} title="Parar" style={{ background: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', color: 'white' }}>
                      <Square size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {recorder.errorMsg && (
              <p style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: '#ef4444', marginTop: '10px' }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} /> {recorder.errorMsg}
              </p>
            )}
          </div>
        )}

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <FileAudio size={14} /> Método de transcrição
          </label>
          <select
            value={organizeMode}
            onChange={e => setOrganizeMode(e.target.value as OrganizeMode)}
            disabled={isProcessing}
            style={{ width: '100%', background: 'var(--color-surface-sunken)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 10px', color: 'white', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
          >
            {(Object.keys(ORGANIZE_MODE_LABELS) as OrganizeMode[]).map(m => (
              <option key={m} value={m}>{ORGANIZE_MODE_LABELS[m]}</option>
            ))}
          </select>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {ORGANIZE_MODE_DESCRIPTIONS[organizeMode]}
          </p>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <Building2 size={14} /> Cliente vinculado (opcional)
          </label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            disabled={isProcessing}
            style={{ width: '100%', background: 'var(--color-surface-sunken)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 10px', color: clientId ? 'white' : 'var(--text-secondary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Nenhum cliente</option>
            {clients.map((c, idx) => {
              const seq = (c as any).sequential_id === 0 ? '00' : String((c as any).sequential_id ?? (idx + 1)).padStart(2, '0');
              return (
                <option key={c.id} value={c.id}>
                  {seq} - {c.nome_fantasia || c.name}
                </option>
              );
            })}
          </select>
        </div>

        {step === 'error' && (
          <p style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.82rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> {errorMsg}
          </p>
        )}

        <button
          onClick={handleGenerate}
          disabled={!file || isProcessing}
          className="btn btn-accent"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (!file || isProcessing) ? 0.6 : 1, cursor: (!file || isProcessing) ? 'not-allowed' : 'pointer' }}
        >
          {isProcessing
            ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={16} /></motion.div> {progressLabel}</>
            : <><Upload size={16} /> Gerar nota</>
          }
        </button>

        {isProcessing && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Reuniões longas podem levar alguns minutos. Você pode trocar de aba — o progresso continua aparecendo no título da aba e a nota é criada automaticamente quando terminar.
          </p>
        )}
      </div>
    </motion.div>
  );
}
