const TARGET_SAMPLE_RATE = 16000; // é pra isso que o Whisper reamostra internamente de qualquer forma
const BYTES_PER_SAMPLE = 2; // PCM 16-bit
const MAX_CHUNK_BYTES = 20 * 1024 * 1024; // margem de segurança abaixo do limite de 25MB da Groq (free tier)

export interface AudioChunk {
  blob: Blob;
  index: number;
}

async function decodeToMono16k(file: Blob): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextCtor();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);

  const numChannels = decoded.numberOfChannels;
  const length = decoded.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / numChannels;
  }

  if (decoded.sampleRate === TARGET_SAMPLE_RATE) {
    audioCtx.close();
    return mono;
  }

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil((length * TARGET_SAMPLE_RATE) / decoded.sampleRate),
    TARGET_SAMPLE_RATE,
  );
  const monoBuffer = offlineCtx.createBuffer(1, length, decoded.sampleRate);
  monoBuffer.copyToChannel(mono, 0);
  const source = offlineCtx.createBufferSource();
  source.buffer = monoBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  audioCtx.close();
  return rendered.getChannelData(0);
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * BYTES_PER_SAMPLE);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * BYTES_PER_SAMPLE, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true);
  view.setUint16(32, BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true); // bits por amostra
  writeString(36, 'data');
  view.setUint32(40, samples.length * BYTES_PER_SAMPLE, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decodifica qualquer formato de áudio suportado pelo navegador (mp3, m4a,
 * wav, webm/opus, ogg...), reamostra pra 16kHz mono — o que o Whisper já
 * faz internamente, então não perde qualidade de transcrição — e divide em
 * pedaços WAV dentro do limite de tamanho da API da Groq. Arquivos grandes
 * (ex: reunião de 1h) viram vários pedaços transcritos em sequência.
 */
export async function prepareAudioChunks(file: File): Promise<AudioChunk[]> {
  const samples = await decodeToMono16k(file);
  const samplesPerChunk = Math.floor((MAX_CHUNK_BYTES - 44) / BYTES_PER_SAMPLE);

  if (samples.length <= samplesPerChunk) {
    return [{ blob: encodeWav(samples, TARGET_SAMPLE_RATE), index: 0 }];
  }

  const chunks: AudioChunk[] = [];
  let index = 0;
  for (let start = 0; start < samples.length; start += samplesPerChunk) {
    const slice = samples.subarray(start, start + samplesPerChunk);
    chunks.push({ blob: encodeWav(slice, TARGET_SAMPLE_RATE), index: index++ });
  }
  return chunks;
}
