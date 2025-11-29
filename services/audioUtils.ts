import { Blob } from "@google/genai";

/**
 * Converts a Float32Array of audio data (from Web Audio API) to a base64 encoded PCM string
 * suitable for the Gemini Live API (16-bit PCM).
 */
export function pcmToGeminiInputBlob(data: Float32Array, sampleRate: number): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling
    const s = Math.max(-1, Math.min(1, data[i]));
    // Scale to 16-bit integer range
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Convert Int16Array to binary string manually to avoid external deps
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

/**
 * Decodes a base64 string containing 16-bit PCM data into an AudioBuffer.
 */
export async function decodeGeminiOutput(
  base64: string,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
}