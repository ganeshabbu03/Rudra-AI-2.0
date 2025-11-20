
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  repairProgress: number;
  repairStage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      repairProgress: 0,
      repairStage: '' 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      repairProgress: 0,
      repairStage: 'DIAGNOSING...'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.startAutoRepair();
  }

  startAutoRepair() {
    const stages = [
      { p: 10, msg: 'ANALYZING CORE DUMP...' },
      { p: 30, msg: 'REROUTING NEURAL PATHWAYS...' },
      { p: 50, msg: 'FLUSHING MEMORY BUFFERS...' },
      { p: 70, msg: 'REINITIALIZING DRIVERS...' },
      { p: 90, msg: 'SYSTEM INTEGRITY CHECK...' },
      { p: 100, msg: 'REBOOTING...' },
    ];

    let currentStage = 0;

    const interval = setInterval(() => {
      if (currentStage >= stages.length) {
        clearInterval(interval);
        window.location.reload();
        return;
      }

      const stage = stages[currentStage];
      this.setState({ 
        repairProgress: stage.p,
        repairStage: stage.msg
      });
      
      currentStage++;
    }, 800);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center font-orbitron text-center overflow-hidden">
          <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
          
          {/* Glitch Text Effect */}
          <h1 className="text-4xl md:text-6xl font-bold text-red-500 mb-4 animate-pulse relative">
            SYSTEM FAILURE
            <span className="absolute top-0 left-0 -ml-1 text-red-400 opacity-50 animate-ping">SYSTEM FAILURE</span>
          </h1>
          
          <div className="text-red-400 font-tech mb-8 max-w-md mx-4 border border-red-900/50 bg-red-900/20 p-4 rounded text-xs text-left">
             ERROR_CODE: 0xCRITICAL<br/>
             MSG: {this.state.error?.message || 'UNKNOWN_EXCEPTION'}
          </div>

          {/* Repair HUD */}
          <div className="w-full max-w-md px-8 relative z-10">
             <div className="flex justify-between text-primary font-tech text-sm mb-2">
               <span>AUTO-REPAIR SEQUENCE</span>
               <span>{this.state.repairProgress}%</span>
             </div>
             
             <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
               <div 
                 className="h-full bg-primary transition-all duration-500 ease-out"
                 style={{ width: `${this.state.repairProgress}%` }}
               ></div>
             </div>
             
             <div className="mt-4 text-secondary font-tech tracking-widest animate-pulse">
               {">"} {this.state.repairStage}
             </div>
          </div>
          
          {/* Decorative Scanlines */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%]"></div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
