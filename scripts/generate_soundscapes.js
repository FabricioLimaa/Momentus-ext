const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050; // 22.05 kHz para tamanho compacto e ótima fidelidade ambiente
const DURATION_SEC = 10;
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC;
const CROSSFADE_SEC = 1.0;
const CROSSFADE_SAMPLES = Math.floor(SAMPLE_RATE * CROSSFADE_SEC);

function createWavBuffer(samples) {
  const byteRate = SAMPLE_RATE * 2; // 16-bit mono = 2 bytes/sample
  const blockAlign = 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16 bits)

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM 16-bit signed integer samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to -1.0 .. 1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(intVal), offset);
    offset += 2;
  }

  return buffer;
}

function applySeamlessLoop(rawSamples) {
  const result = new Float32Array(NUM_SAMPLES);
  // Copia o corpo principal
  for (let i = 0; i < NUM_SAMPLES; i++) {
    result[i] = rawSamples[i];
  }
  // Aplica crossfade senoidal entre o fim (rawSamples[NUM_SAMPLES .. NUM_SAMPLES + CROSSFADE_SAMPLES]) e o início
  for (let i = 0; i < CROSSFADE_SAMPLES; i++) {
    const t = i / CROSSFADE_SAMPLES;
    const fadeOut = Math.cos((t * Math.PI) / 2);
    const fadeIn = Math.sin((t * Math.PI) / 2);

    const endSample = rawSamples[NUM_SAMPLES + i] || 0;
    const startSample = rawSamples[i];

    // Transição suave no início do loop
    result[i] = startSample * fadeIn + endSample * fadeOut;
  }
  return result;
}

// 1. Ruído Marrom (Brownian Noise / Deep Focus)
function generateBrownNoise() {
  const totalNeeded = NUM_SAMPLES + CROSSFADE_SAMPLES + 1000;
  const raw = new Float32Array(totalNeeded);
  let last = 0.0;
  for (let i = 0; i < totalNeeded; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.025 * white) / 1.02;
    raw[i] = last * 3.2; // Ganho ideal
  }
  return applySeamlessLoop(raw);
}

// 2. Chuva Suave (Soft Rain)
function generateRain() {
  const totalNeeded = NUM_SAMPLES + CROSSFADE_SAMPLES + 1000;
  const raw = new Float32Array(totalNeeded);
  let b0 = 0, b1 = 0, b2 = 0;

  for (let i = 0; i < totalNeeded; i++) {
    const white = Math.random() * 2 - 1;
    // Ruído rosa filtrado
    b0 = 0.99765 * b0 + white * 0.0990460;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 1.0526913;
    let pink = (b0 + b1 + b2) * 0.12;

    // Pingos ocasionais aleatórios
    if (Math.random() < 0.0035) {
      pink += (Math.random() * 0.35 - 0.17);
    }
    raw[i] = pink * 0.65;
  }
  return applySeamlessLoop(raw);
}

// 3. Ondas do Mar (Ocean Waves)
function generateWaves() {
  const totalNeeded = NUM_SAMPLES + CROSSFADE_SAMPLES + 1000;
  const raw = new Float32Array(totalNeeded);
  let last = 0.0;
  const waveCycleSamples = SAMPLE_RATE * 5.0; // Ciclo de 5 segundos

  for (let i = 0; i < totalNeeded; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.03 * white) / 1.025;

    // Modulação periódica senoidal suave
    const phase = (i % waveCycleSamples) / waveCycleSamples;
    const waveMod = 0.25 + 0.75 * Math.pow(Math.sin(phase * Math.PI), 2);

    raw[i] = last * waveMod * 3.0;
  }
  return applySeamlessLoop(raw);
}

// 4. Ruído Branco Suave (White Noise filtrado)
function generateWhiteNoise() {
  const totalNeeded = NUM_SAMPLES + CROSSFADE_SAMPLES + 1000;
  const raw = new Float32Array(totalNeeded);
  let prev = 0;
  for (let i = 0; i < totalNeeded; i++) {
    const white = Math.random() * 2 - 1;
    // Filtro passa-baixa suave para eliminar frequências estridentes
    prev = prev * 0.6 + white * 0.4;
    raw[i] = prev * 0.22;
  }
  return applySeamlessLoop(raw);
}

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

const files = [
  { name: 'brown_noise.wav', data: generateBrownNoise() },
  { name: 'rain.wav', data: generateRain() },
  { name: 'waves.wav', data: generateWaves() },
  { name: 'white_noise.wav', data: generateWhiteNoise() },
];

for (const f of files) {
  const filePath = path.join(soundsDir, f.name);
  const buf = createWavBuffer(f.data);
  fs.writeFileSync(filePath, buf);
  console.log(`Gerado: ${f.name} (${(buf.length / 1024).toFixed(1)} KB)`);
}

