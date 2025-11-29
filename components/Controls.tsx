import React from 'react';
import { ConnectionState } from '../types';

interface ControlsProps {
  status: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Controls: React.FC<ControlsProps> = ({ status, onConnect, onDisconnect }) => {
  if (status === ConnectionState.CONNECTED || status === ConnectionState.CONNECTING) {
    return (
      <button
        onClick={onDisconnect}
        disabled={status === ConnectionState.CONNECTING}
        className="group relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-lg transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="sr-only">Hang Up</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative"> 
      <div className={status === ConnectionState.DISCONNECTED ? "ring-animation absolute inset-0 rounded-full" : "hidden"}></div>
      <button
        onClick={onConnect}
        className="relative w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-xl transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-pink-300 transform hover:scale-105 active:scale-95"
      >
        <span className="sr-only">Call Neko</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white animate-pulse" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      </button>
    </div>
  );
};

export default Controls;