import React from 'react';

const RightPanel: React.FC = () => {
  return (
    // Dynamic scaling: Scale down on tablets/small laptops (md/lg), full scale on large screens (xl/2xl)
    <div className="absolute right-4 md:right-8 xl:right-12 top-1/2 -translate-y-1/2 w-[280px] hidden md:flex flex-col gap-6 pointer-events-auto text-right origin-right scale-75 lg:scale-90 xl:scale-100 transition-transform duration-500">
      
      {/* Header Info */}
      <div className="flex flex-col items-end">
         <div className="text-primary font-tech text-xs mb-1">Nasik, MH, India</div>
         <div className="text-muted font-tech text-[10px]">Updated at 4/08/17 8:30 AM IST</div>
      </div>

      {/* Main Temp */}
      <div className="flex flex-col items-end">
         <div className="text-6xl font-orbitron text-white font-bold">21°C</div>
         <div className="text-2xl text-white font-sans mt-1">Fair</div>
      </div>

      {/* Weather Stats Grid */}
      <div className="font-tech text-sm text-muted space-y-1 border-r-2 border-secondary pr-4 glass-panel py-2 rounded-l-lg">
         <div className="flex justify-end gap-2">
             <span>Humidity:</span>
             <span className="text-white">47%</span>
         </div>
         <div className="flex justify-end gap-2">
             <span>Feels Like:</span>
             <span className="text-white">21°</span>
         </div>
         <div className="flex justify-end gap-2">
             <span>Precipitation:</span>
             <span className="text-white">0%</span>
         </div>
         <div className="flex justify-end gap-2">
             <span>Wind:</span>
             <span className="text-white">calm km/h (CALM)</span>
         </div>
         <div className="flex justify-end gap-2">
             <span>Pressure:</span>
             <span className="text-white">mb ()</span>
         </div>
      </div>

      {/* Sun Cycle */}
      <div className="font-tech text-xs text-muted text-right">
         <div>Sunrise: 6:22 AM</div>
         <div>Sunset: 6:51 PM</div>
         <div className="mt-1 text-primary">Moon Phase: Waxing Gibbous</div>
      </div>

      {/* Forecast */}
      <div className="flex flex-col gap-4 mt-2">
         <div>
             <div className="text-primary font-bold font-orbitron">Today</div>
             <div className="text-2xl font-light font-sans text-white">37°</div>
             <div className="text-xs font-tech text-muted">Sunny</div>
         </div>
         <div>
             <div className="text-primary font-bold font-orbitron">Tomorrow</div>
             <div className="text-xs font-tech text-muted">Apr 9</div>
             <div className="text-xl font-light font-sans text-white">38° / 23°</div>
             <div className="text-xs font-tech text-muted">Sunny</div>
         </div>
      </div>
      
      {/* Decorative Ring Graphic Right */}
      <div className="absolute -right-20 top-1/2 w-40 h-40 border-[10px] border-gray-800 rounded-full opacity-50 pointer-events-none"></div>
      <div className="absolute -right-20 top-1/2 w-40 h-40 border-t-[10px] border-primary rounded-full animate-spin-slow pointer-events-none"></div>

    </div>
  );
};

export default RightPanel;