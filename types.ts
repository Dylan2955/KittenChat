export interface AudioVisualizerState {
  isSpeaking: boolean;
  volume: number;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface MessageLog {
  id: string;
  sender: 'user' | 'agent';
  text?: string; // For transcription if we add it later
}