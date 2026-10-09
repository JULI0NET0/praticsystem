"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { useToast } from "@/components/CustomToast";

interface Props {
  disabled?: boolean;
  onRecorded: (file: File, seconds: number) => void | Promise<void>;
}

/** Grava áudio no navegador (MediaRecorder) e entrega um File para o envio como mensagem de voz. */
export default function AudioRecorder({ disabled, onRecorded }: Props) {
  const { showToast } = useToast();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return showToast("Seu navegador não suporta gravação de áudio.", "error");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      cancelled.current = false;
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelled.current || !chunks.current.length) return;
        const type = (rec.mimeType || "audio/webm").split(";")[0];
        const ext = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
        const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        onRecorded(new File(chunks.current, `audio-${Date.now()}.${ext}`, { type }), seconds);
      };
      rec.start();
      recorder.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      timer.current = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
      setRecording(true);
    } catch {
      showToast("Permita o uso do microfone para gravar áudio.", "error");
    }
  };

  const stop = (cancel: boolean) => {
    cancelled.current = cancel;
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stop();
    setRecording(false);
  };

  if (!recording) {
    return <button type="button" className="btn btn-secondary btn-icon" onClick={start} disabled={disabled} aria-label="Gravar áudio" title="Gravar áudio"><Mic size={16} /></button>;
  }
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" className="btn btn-ghost btn-icon" onClick={() => stop(true)} aria-label="Cancelar gravação"><Trash2 size={16} /></button>
      <span style={{ color: "var(--color-danger)", fontVariantNumeric: "tabular-nums", fontSize: "var(--text-ui)" }}>● {mm}:{ss}</span>
      <button type="button" className="btn btn-accent btn-icon" onClick={() => stop(false)} aria-label="Enviar áudio"><Send size={16} /></button>
    </div>
  );
}
