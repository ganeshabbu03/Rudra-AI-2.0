import React, { useState, useEffect } from 'react';

export default function LeftPanel() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format options
  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayString = time.toLocaleDateString([], { weekday: 'long' });
  const dateString = time.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  const ampm = time.toLocaleTimeString([], { hour12: true }).slice(-2).toLowerCase();

  return (
    // Dynamic scaling: Scale down on tablets/small laptops (md/lg), full scale on large screens (xl/2xl)
    <div className="absolute left-4 md:left-8 xl:left-12 top-1/2 -translate-y-1/2 w-[280px] hidden md:flex flex-col gap-8 pointer-events-auto origin-left scale-75 lg:scale-90 xl:scale-100 transition-transform duration-500">
      
      {/* Time Module */}
      <div className="flex flex-col">
        <div className="flex items-start gap-2">
          <h1 className="text-7xl font-orbitron font-bold text-white tracking-tighter neon-text">
            {timeString.split(' ')[0]}
          </h1>
          <span className="text-xl font-orbitron text-muted mt-2">{ampm}</span>
          
          {/* Small Weather Widget near clock */}
          <div className="ml-4 flex flex-col items-center text-highlight">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
             </svg>
             <span className="font-tech text-lg">21°</span>
          </div>
        </div>
        
        <div className="text-primary font-script text-4xl -mt-2 neon-text">
          {dayString}
        </div>
        <div className="text-muted font-orbitron text-lg tracking-widest mt-1">
          {dateString}
        </div>
      </div>

      {/* Separator */}
      <div className="h-[1px] w-20 bg-primary/50"></div>

      {/* Music Player Module */}
      <div className="relative p-4 glass-panel border-l-2 border-primary rounded-r-lg">
         <div className="absolute -left-[3px] top-0 h-4 w-[4px] bg-primary"></div>
         <div className="flex flex-col gap-1">
            <span className="text-white font-orbitron text-sm tracking-widest mb-2 uppercase">Now Playing</span>
            <h2 className="text-2xl text-white font-sans font-light">Paris</h2>
            <h3 className="text-secondary text-lg font-sans">The Chainsmokers</h3>
            
            <div className="mt-4 flex items-center gap-4">
                {/* Placeholder controls */}
                <button className="p-2 rounded-full border border-muted hover:border-primary hover:text-primary text-muted transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-primary relative">
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_white]"></div>
                    </div>
                </div>
                <span className="text-xs font-tech text-muted">1:24 / 3:41</span>
            </div>
         </div>
         <div className="mt-2 text-[10px] text-primary/60 font-tech">
             Rudra Display System By Infinity ∞™
         </div>
      </div>
      
      {/* Quick Stats List */}
      <div className="font-tech text-secondary text-xs space-y-1 text-right opacity-70">
          <div>UNLIMITED</div>
          <div>FILELIST</div>
          <div>LASTTORRENTS</div>
          <div className="text-primary">LINKS</div>
          <div>YOUTUBE</div>
          <div>GOOGLE</div>
      </div>

    </div>
  );
}