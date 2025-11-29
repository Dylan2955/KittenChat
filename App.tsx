import React from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Avatar from './components/Avatar';
import Controls from './components/Controls';
import { ConnectionState } from './types';

const App: React.FC = () => {
  const { connect, disconnect, status, isVolumeSpeaking, error } = useLiveSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            NekoChat
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">
            {status === ConnectionState.CONNECTED 
              ? "Connected to Neko 🟢" 
              : status === ConnectionState.CONNECTING 
                ? "Calling Neko..." 
                : "Your personal AI companion"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        {/* Main Interface */}
        <div className="flex flex-col items-center justify-center space-y-12">
          
          <Avatar 
            isSpeaking={isVolumeSpeaking > 0.05} 
            intensity={isVolumeSpeaking} 
            isConnected={status === ConnectionState.CONNECTED}
          />

          <Controls 
            status={status}
            onConnect={connect}
            onDisconnect={disconnect}
          />

        </div>

        {/* Footer / Status Text */}
        <div className="mt-12 text-center">
            {status === ConnectionState.DISCONNECTED && (
                <p className="text-gray-400 text-xs">
                    Tap the phone to start a voice chat! <br/>
                    <span className="text-pink-400">Headphones recommended 🎧</span>
                </p>
            )}
            {status === ConnectionState.CONNECTED && (
                <div className="flex justify-center items-center space-x-2">
                     <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                    </span>
                    <span className="text-xs text-pink-500 font-semibold uppercase tracking-wider">Live Audio</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;