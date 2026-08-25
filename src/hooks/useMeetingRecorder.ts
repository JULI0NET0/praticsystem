'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

/**
 * Grava áudio do microfone (reunião presencial — não captura áudio de
 * chamadas online, só o som ambiente/microfone). Junta os pedaços num único
 * arquivo ao parar, no mesmo formato (File) que o fluxo de upload já espera.
 */
export function useMeetingRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStopRef = useRef<((file: File) => void) | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const start = useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: blob.type });
        cleanupStream();
        resolveStopRef.current?.(file);
        resolveStopRef.current = null;
      };

      recorder.start(5000); // flush de pedaços a cada 5s, evita perder tudo se algo travar
      mediaRecorderRef.current = recorder;
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
      setStatus('recording');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível acessar o microfone. Verifique a permissão do navegador.');
      setStatus('error');
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof mediaRecorderRef.current?.pause === 'function') {
      mediaRecorderRef.current.pause();
    }
    stopTimer();
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    if (typeof mediaRecorderRef.current?.resume === 'function') {
      mediaRecorderRef.current.resume();
    }
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    setStatus('recording');
  }, []);

  const stop = useCallback((): Promise<File> => {
    return new Promise((resolve) => {
      resolveStopRef.current = resolve;
      stopTimer();
      setStatus('stopped');
      mediaRecorderRef.current?.stop();
    });
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    cleanupStream();
    chunksRef.current = [];
    setElapsedSeconds(0);
    setErrorMsg('');
    setStatus('idle');
  }, []);

  useEffect(() => () => { stopTimer(); cleanupStream(); }, []);

  return { status, elapsedSeconds, errorMsg, start, pause, resume, stop, reset };
}
