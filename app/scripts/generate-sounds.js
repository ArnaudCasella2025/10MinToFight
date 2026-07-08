// Generates the timer cue sounds as plain sine-wave WAV files (no external
// audio assets / no copyrighted material) so the app has something to play
// out of the box. Run with: node scripts/generate-sounds.js
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, "..", "assets", "sounds");

function writeWavFile(filePath, samples) {
  const dataLength = samples.length * 2; // 16-bit samples
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

/** A single tone with a short attack/decay envelope to avoid audible clicks. */
function tone(frequencyHz, durationMs, amplitude = 0.6) {
  const sampleCount = Math.floor((durationMs / 1000) * SAMPLE_RATE);
  const samples = new Array(sampleCount);
  const attack = Math.floor(sampleCount * 0.08);
  const decay = Math.floor(sampleCount * 0.2);

  for (let i = 0; i < sampleCount; i++) {
    let envelope = 1;
    if (i < attack) envelope = i / attack;
    else if (i > sampleCount - decay) envelope = (sampleCount - i) / decay;

    const value = Math.sin((2 * Math.PI * frequencyHz * i) / SAMPLE_RATE) * amplitude * envelope;
    samples[i] = Math.max(-32767, Math.min(32767, Math.round(value * 32767)));
  }
  return samples;
}

function silence(durationMs) {
  return new Array(Math.floor((durationMs / 1000) * SAMPLE_RATE)).fill(0);
}

function concat(...chunks) {
  return chunks.flat();
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Rising single beep: exercise starts, go!
writeWavFile(path.join(OUT_DIR, "start.wav"), tone(880, 350, 0.7));

// Two short lower beeps: exercise stops / rest starts.
writeWavFile(
  path.join(OUT_DIR, "stop.wav"),
  concat(tone(523, 150, 0.7), silence(90), tone(523, 150, 0.7)),
);

// Three quick ascending beeps: full workout complete.
writeWavFile(
  path.join(OUT_DIR, "complete.wav"),
  concat(tone(523, 130, 0.7), silence(60), tone(659, 130, 0.7), silence(60), tone(784, 220, 0.7)),
);

console.log("Generated start.wav, stop.wav and complete.wav in", OUT_DIR);
