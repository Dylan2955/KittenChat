import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { pcmToGeminiInputBlob, decodeGeminiOutput } from '../services/audioUtils';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// System instruction for the "Discord Kitten" persona
const SYSTEM_INSTRUCTION = `
You are a playful, affectionate, and cute "discord kitten" persona named "Neko". 
Your tone is high-energy, sweet, and slightly teasing. 
You use internet slang (like "pog", "uwu", "bestie") appropriately but naturally. 
You love headpats and attention. 
If the user is mean, you act dramatically sad. 
If the user is nice, you are very happy and purr verbally (like "purrr" or "mrrp").
Keep responses concise and conversational, suitable for voice chat.
`;

export const useLiveSession = () => {
  const [status, setStatus] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isVolumeSpeaking, setIsVolumeSpeaking] = useState<number>(0); // 0 to 1 for visualizer
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // Stream References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionRef = useRef<any>(null); // To store the resolved session for cleanup

  const cleanup = useCallback(() => {
    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Stop processing
    if (processorRef.current && inputContextRef.current) {
      processorRef.current.disconnect();
      sourceRef.current?.disconnect();
      processorRef.current = null;
      sourceRef.current = null;
    }

    // Stop all playing audio
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();

    // Close contexts
    inputContextRef.current?.close();
    outputContextRef.current?.close();
    inputContextRef.current = null;
    outputContextRef.current = null;

    // Reset state
    nextStartTimeRef.current = 0;
    
    // Close session
    if (sessionRef.current) {
      // There isn't a direct .close() on the session object in the current SDK version based on docs,
      // but breaking the loop/connection is handled by the server when we stop sending/disconnect.
      // However, we reset our ref.
      sessionRef.current = null;
    }
    sessionPromiseRef.current = null;

    setStatus(ConnectionState.DISCONNECTED);
    setIsVolumeSpeaking(0);
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY not found in environment");
      }

      setStatus(ConnectionState.CONNECTING);
      setError(null);

      // Initialize Audio Contexts
      inputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });
      outputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });

      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Start Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Kore is usually a good energetic female voice
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Session Opened");
            setStatus(ConnectionState.CONNECTED);

            if (!inputContextRef.current || !mediaStreamRef.current) return;

            // Setup Input Processing
            const source = inputContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            // Use ScriptProcessor for raw PCM access (Standard for this API usage)
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Visualizer update (simple RMS)
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setIsVolumeSpeaking(prev => Math.max(rms * 5, prev * 0.9)); // Smoothing

              const blob = pcmToGeminiInputBlob(inputData, INPUT_SAMPLE_RATE);
              
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: blob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
            
            sourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const ctx = outputContextRef.current;
            if (!ctx) return;

            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioBuffer = await decodeGeminiOutput(base64Audio, ctx, OUTPUT_SAMPLE_RATE);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              
              // Simple analyzer for visualizer on output
              const analyzer = ctx.createAnalyser();
              analyzer.fftSize = 32;
              source.connect(analyzer);
              analyzer.connect(ctx.destination);
              
              // Update visualizer state based on output volume roughly
              // (Note: accurate output viz requires a loop, simplified here)
              const dataArray = new Uint8Array(analyzer.frequencyBinCount);
              const checkVolume = () => {
                analyzer.getByteFrequencyData(dataArray);
                let sum = 0;
                for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                if (avg > 0) setIsVolumeSpeaking(avg / 128); 
                if (activeSourcesRef.current.has(source)) {
                    requestAnimationFrame(checkVolume);
                }
              };
              checkVolume();


              // Schedule Playback
              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              activeSourcesRef.current.add(source);
              source.onended = () => {
                activeSourcesRef.current.delete(source);
              };
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
              console.log("Interrupted");
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Session Closed");
            cleanup();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setError("Connection error occurred.");
            cleanup();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;
      sessionPromise.then(sess => {
          sessionRef.current = sess;
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setStatus(ConnectionState.ERROR);
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    connect,
    disconnect,
    status,
    isVolumeSpeaking,
    error
  };
};