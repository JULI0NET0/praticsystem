"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { LeadMessage } from "@/types/database";

const BARS = 32;
const SPEEDS = [1, 1.5, 2] as const;

// Um áudio por vez em toda a tela.
let playing: HTMLAudioElement | null = null;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Barras determinísticas a partir do id: usadas até a onda real carregar (ou se o navegador não decodificar o formato). */
function fallbackPeaks(seed: string): number[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: BARS }, () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return 0.25 + (h % 1000) / 1333;
  });
}

async function decodePeaks(url: string): Promise<number[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
    void ctx.close();
    const data = buffer.getChannelData(0);
    const step = Math.floor(data.length / BARS) || 1;
    const peaks = Array.from({ length: BARS }, (_, i) => {
      let max = 0;
      for (let j = i * step; j < (i + 1) * step && j < data.length; j++) max = Math.max(max, Math.abs(data[j]));
      return max;
    });
    const top = Math.max(...peaks) || 1;
    return peaks.map((p) => Math.max(0.12, p / top));
  } catch {
    return null;
  }
}

interface Props {
  m: LeadMessage;
  /** Foto do contato (mensagem recebida). */
  avatarUrl?: string | null;
  initials: string;
}

/** Áudio estilo WhatsApp: foto do contato, onda, tempo e velocidade 1×/1,5×/2×. */
export default function AudioBubble({ m, avatarUrl, initials }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>(() => fallbackPeaks(m.id));
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(m.media_seconds ?? 0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useEffect(() => {
    let alive = true;
    if (m.media_url) decodePeaks(m.media_url).then((p) => { if (alive && p) setPeaks(p); });
    return () => { alive = false; };
  }, [m.media_url]);

  useEffect(() => () => {
    const a = audioRef.current;
    if (a) { a.pause(); if (playing === a) playing = null; }
  }, []);

  const ensureAudio = useCallback(() => {
    if (audioRef.current || !m.media_url) return audioRef.current;
    const a = new Audio(m.media_url);
    a.preload = "metadata";
    a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) setDuration(a.duration); };
    a.ontimeupdate = () => setTime(a.currentTime);
    a.onplay = () => setIsPlaying(true);
    a.onpause = () => setIsPlaying(false);
    a.onended = () => { setIsPlaying(false); setTime(0); };
    audioRef.current = a;
    return a;
  }, [m.media_url]);

  const toggle = () => {
    const a = ensureAudio();
    if (!a) return;
    if (a.paused) {
      if (playing && playing !== a) playing.pause();
      playing = a;
      a.playbackRate = speed;
      void a.play();
    } else a.pause();
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ensureAudio();
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    setTime(a.currentTime);
  };

  if (!m.media_url) return <em style={{ opacity: 0.8 }}>🎤 Áudio (arquivo indisponível)</em>;

  const progress = duration ? time / duration : 0;
  return (
    <div className="pp-audio">
      <span className="pp-audio-avatar">
        {avatarUrl && m.direction === "in" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          initials
        )}
      </span>
      <button type="button" className="pp-audio-play" onClick={toggle} aria-label={isPlaying ? "Pausar áudio" : "Tocar áudio"}>
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="pp-audio-wave" onClick={seek} role="slider" aria-label="Posição do áudio" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} tabIndex={0}>
        {peaks.map((p, i) => (
          <span key={i} data-done={i / BARS < progress} style={{ height: `${Math.round(p * 100)}%` }} />
        ))}
      </div>
      <span className="pp-audio-time">{isPlaying || time > 0 ? clock(time) : clock(duration)}</span>
      <button type="button" className="pp-audio-speed" onClick={cycleSpeed} aria-label={`Velocidade ${speed}x`}>{speed === 1.5 ? "1,5" : speed}×</button>
    </div>
  );
}
