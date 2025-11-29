import React from 'react';

interface AvatarProps {
  isSpeaking: boolean;
  intensity: number; // 0 to 1
  isConnected: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ isSpeaking, intensity, isConnected }) => {
  // Simple "breathing" animation when idle, "bouncing" when speaking
  const scale = 1 + (intensity * 0.2);
  
  return (
    <div className="relative w-64 h-64 mx-auto mb-8">
      {/* Background Glow */}
      <div 
        className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
          isConnected ? 'bg-pink-400 opacity-40' : 'bg-gray-300 opacity-20'
        }`}
        style={{ transform: `scale(${1 + intensity})` }}
      />
      
      {/* Avatar Container */}
      <div 
        className={`relative w-full h-full rounded-full border-4 border-white shadow-xl overflow-hidden bg-pink-100 transition-transform duration-100 ease-out`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Placeholder for Anime Character - Using CSS Art or Emoji for simplicity/no-external-assets-dependence */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
            <div className="text-8xl select-none filter drop-shadow-md">
                {isConnected ? (intensity > 0.1 ? '😸' : '😺') : '😿'}
            </div>
            {isConnected && (
                <div className="mt-4 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full text-pink-600 font-bold text-sm">
                    {intensity > 0.1 ? 'Meow!' : 'Listening...'}
                </div>
            )}
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className={`absolute bottom-2 right-6 w-6 h-6 rounded-full border-2 border-white ${
        isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
      }`} />
    </div>
  );
};

export default Avatar;