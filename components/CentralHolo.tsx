import React from 'react';

interface CentralHoloProps {
  isActive: boolean;
  isSpeaking: boolean;
}

const CentralHolo: React.FC<CentralHoloProps> = ({ isActive, isSpeaking }) => {
  return (
    // Using vmin allows the holo to scale with the smaller viewport dimension, ensuring it never overflows
    <div className="relative w-[75vmin] h-[75vmin] md:w-[45vmin] md:h-[45vmin] flex items-center justify-center pointer-events-none select-none transition-all duration-500">
      
      {/* Outer Ring - Static Decorative */}
      <div className="absolute inset-0 border border-primary/20 rounded-full"></div>
      
      {/* Rotating Dashed Ring */}
      <div className={`absolute inset-[3%] border-[2px] border-dashed border-primary/40 rounded-full ${isActive ? 'animate-spin-slow' : ''}`}></div>
      
      {/* Counter Rotating Ring */}
      <div className={`absolute inset-[12%] border border-secondary/30 rounded-full ${isActive ? 'animate-spin-reverse-slow' : ''}`}></div>
      
      {/* Radial Bars (SVG) */}
      <svg className="absolute w-full h-full animate-[spin_60s_linear_infinite]" viewBox="0 0 500 500">
         <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0" />
              <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </linearGradient>
         </defs>
         {Array.from({ length: 24 }).map((_, i) => (
           <rect
             key={i}
             x="248"
             y="20"
             width="4"
             height="40"
             fill="url(#grad1)"
             transform={`rotate(${i * 15} 250 250)`}
             className="opacity-50"
           />
         ))}
      </svg>

      {/* Inner Interactive Core */}
      <div className="relative flex items-center justify-center w-[50%] h-[50%]">
         {/* Pulsing Glow */}
         <div className={`absolute inset-0 bg-primary/10 rounded-full blur-2xl transition-all duration-300 ${isSpeaking ? 'scale-125 opacity-80' : 'scale-100 opacity-30'}`}></div>
         
         {/* Core Ring */}
         <div className={`absolute inset-0 border-4 border-primary rounded-full shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all duration-200 ${isSpeaking ? 'border-highlight scale-105' : ''}`}></div>
         
         {/* Center Graphics */}
         <div className="flex flex-col items-center justify-center z-10">
             <div className="text-primary font-orbitron text-[clamp(1.5rem,4vmin,3rem)] font-bold tracking-widest">
                 {isSpeaking ? 'ACTIVE' : 'STANDBY'}
             </div>
             <div className="text-[clamp(0.6rem,1.5vmin,0.8rem)] text-secondary font-tech mt-2 tracking-[0.3em]">
                 SYSTEM STATUS
             </div>
             <div className="mt-4 w-[30%] h-1 bg-gray-800 overflow-hidden rounded-full">
                 <div className={`h-full bg-primary transition-all duration-75 ${isSpeaking ? 'w-full animate-pulse' : 'w-1/3'}`}></div>
             </div>
         </div>
      </div>

      {/* Decorative Tick Marks */}
      <div className="absolute bottom-[10%] text-primary/50 font-tech text-[1.5vmin]">
          102010
      </div>
    </div>
  );
};

export default CentralHolo;