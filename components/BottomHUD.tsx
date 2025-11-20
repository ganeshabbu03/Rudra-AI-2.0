
import React from 'react';
import { LogEntry, ConnectionState } from '../types';

interface BottomHUDProps {
  logs: LogEntry[];
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenTools: () => void;
  onInstall?: () => void;
  showInstall?: boolean;
}

const BottomHUD: React.FC<BottomHUDProps> = ({ 
  logs, 
  connectionState, 
  onConnect, 
  onDisconnect, 
  onOpenTools,
  onInstall,
  showInstall
}) => {
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[200px] pointer-events-none flex flex-col justify-end pb-6">
      
      {/* Symmetrical Outline SVG Background */}
      <svg className="absolute bottom-0 w-full h-full text-primary/20 fill-none" preserveAspectRatio="none" viewBox="0 0 1000 200">
         <path d="M0,200 L200,200 L250,150 L750,150 L800,200 L1000,200" stroke="currentColor" strokeWidth="2" />
         <path d="M260,160 L740,160" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" />
         {/* Decorative ticks */}
         <line x1="300" y1="160" x2="300" y2="170" stroke="currentColor" strokeWidth="2" />
         <line x1="500" y1="160" x2="500" y2="180" stroke="currentColor" strokeWidth="2" />
         <line x1="700" y1="160" x2="700" y2="170" stroke="currentColor" strokeWidth="2" />
      </svg>

      {/* Central Interaction Area */}
      <div className="relative z-10 flex justify-center items-end gap-4 md:gap-10 mb-4 pointer-events-auto">
          
          {/* Left Stats */}
          <div className="hidden md:block text-left font-tech text-xs text-secondary w-40">
             <div className="border-b border-secondary/50 mb-1 pb-1">ROL PANEL</div>
             <button 
               onClick={onOpenTools}
               className="text-primary hover:text-white hover:shadow-[0_0_10px_rgba(0,229,255,0.5)] transition-all w-full text-left mt-2 border border-primary/30 px-2 py-1 rounded"
             >
               [ OPEN SYSTEM TOOLS ]
             </button>
          </div>

          {/* Main Button Group */}
          <div className="flex flex-col items-center gap-2">
             <button 
               onClick={connectionState === ConnectionState.CONNECTED ? onDisconnect : onConnect}
               className={`
                 relative group overflow-hidden px-8 md:px-12 py-3 
                 font-orbitron font-bold tracking-widest uppercase
                 transition-all duration-300 min-w-[200px]
                 ${connectionState === ConnectionState.CONNECTED 
                    ? 'text-red-500 border border-red-500 hover:bg-red-500/10' 
                    : connectionState === ConnectionState.CONNECTING
                        ? 'text-highlight border border-highlight'
                        : 'text-primary border border-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(0,229,255,0.5)]'
                 }
                 before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:skew-x-[-20deg]
                 hover:before:animate-[shimmer_1s_infinite]
               `}
             >
               {connectionState === ConnectionState.CONNECTED ? 'TERMINATE' : connectionState === ConnectionState.CONNECTING ? 'INITIALIZING...' : 'INITIALIZE VOICE'}
             </button>
             
             {/* Mobile Only Tools Button */}
             <button 
               onClick={onOpenTools}
               className="md:hidden text-xs font-tech text-primary/70 border border-primary/30 px-4 py-1 rounded uppercase hover:bg-primary/10 w-full"
             >
                [ SYSTEM TOOLS ]
             </button>

             {/* Install App Button - Shows only when available */}
             {showInstall && (
               <button 
                 onClick={onInstall}
                 className="text-[10px] font-orbitron text-highlight border border-highlight/30 px-4 py-1 rounded uppercase hover:bg-highlight/10 w-full animate-pulse"
               >
                  ▼ INSTALL SYSTEM
               </button>
             )}
             
             <div className="mt-1 flex gap-1">
                {Array.from({length: 10}).map((_, i) => (
                   <div key={i} className={`w-2 h-1 ${i < 4 ? 'bg-primary' : 'bg-gray-700'}`}></div>
                ))}
             </div>
          </div>

          {/* Right Stats */}
          <div className="hidden md:block text-right font-tech text-xs text-secondary w-40">
             <div className="border-b border-secondary/50 mb-1 pb-1">NETWORK CON</div>
             <div className="flex justify-between"><span>UPLINK</span><span>GB/s</span></div>
             <div className="flex justify-between"><span>SECURE</span><span>TRUE</span></div>
          </div>
      </div>

      {/* Log Console (Mobile/Desktop) */}
      <div className="absolute bottom-4 left-4 md:left-10 max-w-[200px] md:max-w-xs h-32 overflow-hidden flex flex-col justify-end font-tech text-[10px] pointer-events-none mask-image-linear-gradient">
          {logs.slice(-5).map((log) => (
             <div key={log.id} className={`mb-1 ${log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-highlight' : log.type === 'success' ? 'text-green-400' : 'text-primary'}`}>
                <span className="opacity-50">[{log.timestamp}]</span> {log.message}
             </div>
          ))}
      </div>

    </div>
  );
};

export default BottomHUD;
