// Converte a gravação (webm/opus do MediaRecorder) em WAV PCM 16 bits, mono, na taxa pedida.
// WAV porque é o formato que o Gemini aceita direto pelo gateway (input_audio).

async function decodificarEReamostrar(gravacao: Blob, taxa: number): Promise<Float32Array> {
  const bytes = await gravacao.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const original = await ctx.decodeAudioData(bytes);
    const quadros = Math.max(1, Math.ceil(original.duration * taxa));
    const offline = new OfflineAudioContext(1, quadros, taxa);
    const fonte = offline.createBufferSource();
    fonte.buffer = original; // várias faixas são misturadas em mono pelo destino de 1 canal
    fonte.connect(offline.destination);
    fonte.start();
    const renderizado = await offline.startRendering();
    return renderizado.getChannelData(0);
  } finally {
    void ctx.close();
  }
}

function escreverTexto(v: DataView, pos: number, s: string): void {
  for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i));
}

function paraPcm16Wav(amostras: Float32Array, taxa: number): ArrayBuffer {
  const bytesDados = amostras.length * 2;
  const buf = new ArrayBuffer(44 + bytesDados);
  const v = new DataView(buf);
  escreverTexto(v, 0, "RIFF");
  v.setUint32(4, 36 + bytesDados, true);
  escreverTexto(v, 8, "WAVE");
  escreverTexto(v, 12, "fmt ");
  v.setUint32(16, 16, true); // tamanho do bloco fmt
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por quadro
  v.setUint16(34, 16, true); // bits por amostra
  escreverTexto(v, 36, "data");
  v.setUint32(40, bytesDados, true);
  for (let i = 0; i < amostras.length; i++) {
    const s = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

export async function gravacaoParaWav(gravacao: Blob, taxa: number): Promise<{ wav: ArrayBuffer; duracaoMs: number }> {
  const amostras = await decodificarEReamostrar(gravacao, taxa);
  return { wav: paraPcm16Wav(amostras, taxa), duracaoMs: Math.round((amostras.length / taxa) * 1000) };
}
