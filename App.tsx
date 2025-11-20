
import React, { useState, useCallback, useEffect } from 'react';
import CentralHolo from './components/CentralHolo';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomHUD from './components/BottomHUD';
import FeaturePanel from './components/FeaturePanel';
import { useGeminiLive } from './hooks/useGeminiLive';
import { LogEntry } from './types';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isInterfaceHidden, setIsInterfaceHidden] = useState(false);
  
  // Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      console.log("Install prompt captured");
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
  };
  
  const addLog = useCallback((message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    };
    setLogs(prev => [...prev.slice(-20), newLog]);
  }, []);

  const { connect, disconnect, connectionState, isVolumeActive } = useGeminiLive({
    onLog: addLog
  });

  return (
    // Use h-[100dvh] to handle dynamic address bars on mobile browsers correctly
    <div className="relative w-full h-[100dvh] bg-background text-white overflow-hidden font-sans selection:bg-primary selection:text-black">
      
      {/* Background Grid Effect */}
      <div className={`absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-500 ${isInterfaceHidden ? 'opacity-0' : 'opacity-20'}`} 
           style={{ 
             backgroundImage: 'linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)', 
             backgroundSize: '50px 50px' 
           }}>
      </div>
      
      {/* Vignette */}
      <div className={`absolute inset-0 bg-radial-gradient pointer-events-none transition-opacity duration-500 ${isInterfaceHidden ? 'opacity-0' : 'opacity-100'}`} style={{ background: 'radial-gradient(circle, transparent 40%, #0A0A0A 90%)' }}></div>

      {/* Main UI Layout */}
      <main className="relative w-full h-full flex items-center justify-center z-10">
        
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isInterfaceHidden ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          <LeftPanel />
          
          <div className={`transition-all duration-500 ${isToolsOpen ? 'opacity-20 scale-50 blur-sm' : 'scale-75 md:scale-100'}`}>
            <CentralHolo 
              isActive={connectionState === 'CONNECTED'} 
              isSpeaking={isVolumeActive} 
            />
          </div>
          
          <RightPanel />
          
          <BottomHUD 
            logs={logs}
            connectionState={connectionState}
            onConnect={connect}
            onDisconnect={disconnect}
            onOpenTools={() => setIsToolsOpen(true)}
            onInstall={handleInstall}
            showInstall={!!deferredPrompt}
          />
        </div>

        {/* Feature Panel Overlay */}
        <FeaturePanel 
           isOpen={isToolsOpen} 
           onClose={() => setIsToolsOpen(false)} 
           onLog={addLog} 
           onHiddenChange={setIsInterfaceHidden}
        />

      </main>

      {/* API Key Warning Modal (if needed for dev) */}
      {!process.env.API_KEY && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="border border-red-500 p-8 rounded bg-gray-900 text-center">
             <h2 className="text-2xl text-red-500 font-orbitron mb-4">SYSTEM ERROR</h2>
             <p className="text-white mb-4">API_KEY environment variable is missing.</p>
             <p className="text-sm text-gray-400">Please configure the application environment properly.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
