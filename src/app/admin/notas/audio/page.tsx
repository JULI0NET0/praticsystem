'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, AudioLines, Loader2, AlertTriangle, Building2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Client } from '@/types/database';
import { useToast } from '@/components/CustomToast';
import { transcribeMeetingAudio, organizeMeetingNotes, extractMeetingTitleFromMarkdown } from '@/lib/notesAudio';
import { markdownToTiptapJson } from '@/lib/markdownToTiptapJson';

type Step = 'idle' | 'transcribing' | 'organizing' | 'error';

export default function AudioNotaPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'nome_fantasia'>[]>([]);
  const [clientId, setClientId] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progressLabel, setProgressLabel] = useState('');

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
      const markdown = await organizeMeetingNotes(transcript);

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
              const seq = (c as any).sequential_id || idx + 1;
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
      </div>
    </motion.div>
  );
}
