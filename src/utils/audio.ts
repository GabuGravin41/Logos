/**
 * Web Audio voice signature analyzer and pitch detector
 */

export interface VoiceSignature {
  id: string;
  averageFrequency: number;
  pitchRange: string; // "Low (Bass/Baritone)", "Medium (Tenor/Alto)", "High (Soprano)"
  name: string;
}

// Simple autocorrelation algorithm to estimate fundamental frequency/pitch of the voice
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  // Perform simple peak-finding to estimate pitch
  const size = buffer.length;
  let maxSamples = Math.floor(size / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < size; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) {
    return -1; // Silent
  }

  let r1 = 0, r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < maxSamples; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = size - 1; i >= maxSamples; i--) {
    if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
  }

  const croppedBuffer = buffer.subarray(r1, r2);
  const croppedSize = croppedBuffer.length;

  const correlations = new Float32Array(maxSamples);
  for (let offset = 0; offset < maxSamples; offset++) {
    let correlation = 0;
    for (let i = 0; i < croppedSize - offset; i++) {
      correlation += croppedBuffer[i] * croppedBuffer[i + offset];
    }
    correlations[offset] = correlation;
  }

  // Find the first peak after the initial drop
  let d = 0;
  while (d < maxSamples - 1 && correlations[d] > correlations[d + 1]) {
    d++;
  }
  let maxVal = -1;
  let maxIndex = -1;
  for (let i = d; i < maxSamples; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxIndex = i;
    }
  }

  if (maxIndex > -1) {
    const pitch = sampleRate / maxIndex;
    if (pitch > 50 && pitch < 1000) {
      return pitch; // Return fundamental frequency in Hz (restricted to human voice range)
    }
  }

  return -1;
}

/**
 * Determine speaker classification based on frequency/pitch.
 * This classifies voice signals into 3 general voice signatures:
 * - Low Pitch (< 140 Hz) -> Speaker Signature Alpha (typically deeper voices)
 * - Medium Pitch (140 - 240 Hz) -> Speaker Signature Beta (typically mid-range voices)
 * - High Pitch (> 240 Hz) -> Speaker Signature Gamma (typically higher-pitched voices)
 */
export function classifyVoiceSignature(pitchHz: number): { id: string; name: string; pitchRange: string } {
  if (pitchHz < 50 || pitchHz > 600) {
    // Default fallback if pitch is noisy
    return { id: "sig_delta", name: "Voice Signature Delta", pitchRange: "Undetermined Pitch" };
  }
  
  if (pitchHz < 145) {
    return {
      id: "sig_alpha",
      name: "Voice Signature Alpha",
      pitchRange: `Low Frequency (~${Math.round(pitchHz)} Hz)`
    };
  } else if (pitchHz <= 240) {
    return {
      id: "sig_beta",
      name: "Voice Signature Beta",
      pitchRange: `Mid Frequency (~${Math.round(pitchHz)} Hz)`
    };
  } else {
    return {
      id: "sig_gamma",
      name: "Voice Signature Gamma",
      pitchRange: `High Frequency (~${Math.round(pitchHz)} Hz)`
    };
  }
}
