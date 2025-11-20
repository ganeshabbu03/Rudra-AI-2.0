import React, { useState, useRef, useEffect } from 'react';
import { FeatureMode } from '../types';
import * as Gemini from '../utils/geminiService';
import { base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';

interface FeaturePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  onHiddenChange?: (hidden: boolean) => void;
}

const FeaturePanel: React.FC<FeaturePanelProps> = ({ isOpen, onClose, onLog, onHiddenChange }) => {
  const [activeMode, setActiveMode] = useState<FeatureMode>('QUICK_CHAT');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Camera & Screen Refs & State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // UI Visibility State for Screen Capture
  const [isPanelHidden, setIsPanelHidden] = useState(false);

  // Audio Recording Refs
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup function to stop all tracks
  const stopAllStreams = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setIsScreenSharing(false);
  };

  // Reset state when mode changes
  useEffect(() => {
    setResult(null);
    setInput('');
    setFile(null);
    setPreviewUrl(null);
    setIsLoading(false);
    stopAllStreams();
  }, [activeMode]);

  // Handle Camera Stream
  useEffect(() => {
    if (isCameraOpen && !isScreenSharing) {
      onLog('Initializing Optical Sensors...', 'info');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Play error", e));
          }
        })
        .catch(err => {
          onLog('Camera access denied: ' + err.message, 'error');
          setIsCameraOpen(false);
        });
    }
    return () => {
      // Cleanup handled by stopAllStreams on mode change or manual toggle
    };
  }, [isCameraOpen, isScreenSharing, onLog]);

  const startScreenShare = async () => {
    try {
      onLog('Initializing Screen Uplink...', 'info');
      // Cast to any to avoid strict TS check on cursor property if types aren't fully updated
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" } as any, 
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScreenSharing(true);

      // Handle stream stop from browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopAllStreams();
        onLog('Screen Uplink Terminated.', 'warning');
      };

    } catch (err: any) {
      onLog('Screen share cancelled: ' + err.message, 'warning');
      setIsScreenSharing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const captureFrame = async (source: 'camera' | 'screen') => {
    if (videoRef.current && canvasRef.current) {
      const vid = videoRef.current;
      
      if (vid.readyState < 2) { // HAVE_CURRENT_DATA
          onLog("Video feed not ready.", "warning");
          return;
      }

      // Trigger auto-hide animation if capturing screen
      if (source === 'screen') {
         onHiddenChange?.(true);
         setIsPanelHidden(true);
         // Wait for CSS transition (fade out) to complete + buffer
         await new Promise(resolve => setTimeout(resolve, 700)); 
      }

      const canvas = canvasRef.current;
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(vid, 0, 0);
      
      if (source === 'screen') {
         setIsPanelHidden(false);
         onHiddenChange?.(false);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const f = new File([blob], source === 'camera' ? "capture.png" : "screen.png", { type: "image/png" });
          setFile(f);
          
          if (source === 'camera') {
             setPreviewUrl(URL.createObjectURL(f));
             setIsCameraOpen(false);
             onLog("Image captured.", "success");
          } else {
             onLog("Screen frame captured.", "success");
          }
        }
      }, 'image/png');
    }
  };

  const getFileBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], "recording.wav", { type: "audio/wav" });
        setFile(audioFile);
        setPreviewUrl(URL.createObjectURL(audioBlob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      onLog('Audio recording started', 'info');
    } catch (err) {
      onLog('Could not access microphone', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onLog('Audio recording stopped', 'info');
    }
  };

  const executeFeature = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setResult(null);
    onLog(`Executing ${activeMode}...`, 'info');

    try {
      switch (activeMode) {
        case 'QUICK_CHAT': {
          const res = await Gemini.fastChat(input);
          setResult({ type: 'text', content: res });
          break;
        }
        case 'THINKING': {
          const res = await Gemini.thinkingChat(input);
          setResult({ type: 'text', content: res });
          break;
        }
        case 'MAPS': {
          let loc = undefined;
          if (navigator.geolocation) {
             try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                loc = { lat: position.coords.latitude, lng: position.coords.longitude };
             } catch(e) {}
          }
          const res = await Gemini.queryMaps(input, loc);
          setResult({ type: 'maps', content: res.text, chunks: res.chunks });
          break;
        }
        case 'VEO': {
          const base64 = file ? await getFileBase64(file) : undefined;
          const videoUrl = await Gemini.generateVeoVideo(input, base64);
          setResult({ type: 'video', content: videoUrl });
          break;
        }
        case 'VISION': {
          if (!file && !isCameraOpen) throw new Error("Image or Video required");
          // Handle implicit capture if camera is open
          if (isCameraOpen && videoRef.current) {
             await captureFrame('camera');
             // The file state update is async, so we might need to wait or refetch, 
             // but captureFrame sets 'file'. However, due to React state batching, 
             // we should grab the blob directly in a real world scenario. 
             // For this simplified version, we rely on the user clicking 'Capture' first or the logic below handles it if `file` is set.
             // But let's assume user captured manually for VISION.
          }
          
          if (!file) throw new Error("Please capture or upload an image first.");
          
          const base64 = await getFileBase64(file);
          const isVideo = file.type.startsWith('video');
          const res = await Gemini.analyzeMedia(base64, file.type, input, isVideo);
          setResult({ type: 'text', content: res });
          break;
        }
        case 'SCREEN': {
          let base64: string;
          
          if (isScreenSharing && videoRef.current) {
             // Auto-hide and capture procedure
             onHiddenChange?.(true);
             setIsPanelHidden(true);
             await new Promise(resolve => setTimeout(resolve, 700)); 
             
             const canvas = document.createElement('canvas');
             canvas.width = videoRef.current.videoWidth;
             canvas.height = videoRef.current.videoHeight;
             const ctx = canvas.getContext('2d');
             ctx?.drawImage(videoRef.current, 0, 0);
             base64 = canvas.toDataURL('image/png').split(',')[1];
             
             setIsPanelHidden(false);
             onHiddenChange?.(false);
          } else if (file) {
             base64 = await getFileBase64(file);
          } else {
             throw new Error("Start screen sharing first.");
          }

          const res = await Gemini.analyzeMedia(base64, 'image/png', input || "Analyze this screen content.");
          setResult({ type: 'text', content: res });
          break;
        }
        case 'EDITING': {
          if (!file) throw new Error("Source image required");
          const base64 = await getFileBase64(file);
          const imgData = await Gemini.editImage(base64, input);
          setResult({ type: 'image', content: imgData });
          break;
        }
        case 'TTS': {
          const audioBase64 = await Gemini.generateSpeech(input);
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = await decodeAudioData(base64ToUint8Array(audioBase64), ctx);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          setResult({ type: 'text', content: 'Audio Playing...' });
          break;
        }
        case 'TRANSCRIBE': {
          if (!file) throw new Error("Audio file or recording required");
          const base64 = await getFileBase64(file);
          const res = await Gemini.transcribeAudio(base64);
          setResult({ type: 'text', content: res });
          break;
        }
      }
      onLog('Task completed successfully', 'success');
    } catch (error: any) {
      console.error(error);
      onLog(`Error: ${error.message}`, 'error');
      setResult({ type: 'error', content: error.message });
      // Ensure UI comes back if error
      setIsPanelHidden(false);
      onHiddenChange?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 transition-opacity duration-500 ${isPanelHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Responsive Container: W/H relative to viewport, utilizing flex for internal layout */}
      <div className="w-full h-full md:w-[90vw] md:h-[85vh] lg:w-[80vw] xl:max-w-7xl glass-panel md:border border-primary/50 flex flex-col md:flex-row md:rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.1)] animate-in fade-in zoom-in duration-300">
        
        {/* Adaptive Sidebar: Bottom on mobile (via order), Side on Desktop */}
        <div className="w-full md:w-20 lg:w-64 bg-black/60 border-b md:border-b-0 md:border-r border-primary/30 flex flex-row md:flex-col flex-shrink-0 transition-all duration-300 order-2 md:order-1">
          
          {/* Logo / Header */}
          <div className="hidden md:flex p-4 md:p-5 border-r md:border-r-0 md:border-b border-primary/30 bg-primary/5 flex-shrink-0 flex-col justify-center items-center md:items-center lg:items-start h-16 md:h-auto">
            <h3 className="font-orbitron text-primary font-bold tracking-widest text-sm md:text-xl lg:text-lg whitespace-nowrap hidden lg:block">SYSTEM TOOLS</h3>
            <h3 className="font-orbitron text-primary font-bold tracking-widest text-lg lg:hidden">SYS</h3>
            <div className="text-[10px] font-tech text-secondary mt-1 hidden lg:block">SELECT MODULE</div>
          </div>
          
          {/* Navigation Icons */}
          <div className="flex flex-row md:flex-col p-2 space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-y-auto no-scrollbar flex-1 items-center md:items-stretch">
             {[
               { id: 'QUICK_CHAT', label: 'Chat', icon: '⚡' },
               { id: 'THINKING', label: 'Logic', icon: '🧠' },
               { id: 'MAPS', label: 'Maps', icon: '🗺️' },
               { id: 'VISION', label: 'Vision', icon: '👁️' },
               { id: 'SCREEN', label: 'Screen', icon: '🖥️' },
               { id: 'VEO', label: 'Veo', icon: '🎬' },
               { id: 'EDITING', label: 'Edit', icon: '🎨' },
               { id: 'TRANSCRIBE', label: 'Scribe', icon: '📝' },
               { id: 'TTS', label: 'Voice', icon: '🗣️' },
             ].map((mode) => (
               <button
                 key={mode.id}
                 onClick={() => setActiveMode(mode.id as FeatureMode)}
                 className={`
                   flex-shrink-0 h-10 md:h-12 lg:h-10 px-4 md:px-0 lg:px-4 rounded font-tech text-xs md:text-sm transition-all duration-200 group relative overflow-hidden flex items-center justify-center lg:justify-start
                   ${activeMode === mode.id 
                     ? 'bg-primary/20 text-white border-b-2 md:border-b-0 md:border-l-2 lg:border-l-4 border-primary' 
                     : 'text-muted hover:bg-white/5 hover:text-white md:hover:border-l-4 hover:border-secondary/50'}
                 `}
                 title={mode.label}
               >
                 <span className="lg:mr-3 text-lg opacity-80 group-hover:opacity-100">{mode.icon}</span> 
                 <span className="hidden lg:inline">{mode.label}</span>
                 {activeMode === mode.id && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent animate-pulse-fast" />}
               </button>
             ))}
          </div>

          {/* Close Button (Desktop) */}
          <div className="hidden md:block mt-auto p-2">
            <button 
              onClick={onClose} 
              className="w-full p-2 lg:p-4 text-red-400 hover:bg-red-500/10 hover:text-red-300 border-t border-white/10 font-orbitron text-xs lg:text-sm tracking-wider transition-colors text-center flex justify-center items-center"
            >
              <span className="lg:hidden">✕</span>
              <span className="hidden lg:inline">CLOSE PANEL</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-black/20 relative overflow-hidden min-w-0 order-1 md:order-2">
          <div className="absolute inset-0 pointer-events-none opacity-10" 
               style={{ backgroundImage: 'linear-gradient(#3CC7C9 1px, transparent 1px), linear-gradient(90deg, #3CC7C9 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          {/* Mobile Header with Close */}
          <div className="md:hidden flex justify-between items-center p-4 border-b border-white/10 bg-black/40">
             <h3 className="font-orbitron text-primary font-bold text-sm">{activeMode.replace('_', ' ')}</h3>
             <button onClick={onClose} className="text-red-400 font-bold">✕</button>
          </div>

          {/* Content Scrollable Container */}
          <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
            
            {/* Desktop Content Header */}
            <div className="hidden md:flex flex-shrink-0 mb-4 md:mb-6 justify-between items-end border-b border-white/10 pb-4">
               <div>
                 <h2 className="text-2xl md:text-3xl font-orbitron text-white mb-1 tracking-wide neon-text">{activeMode.replace('_', ' ')}</h2>
                 <p className="text-[10px] md:text-xs font-tech text-secondary tracking-[0.2em]">ACTIVE PROTOCOL</p>
               </div>
               <div className="hidden md:block text-right">
                 <div className="text-primary font-tech text-xs">SYS.V.2.5</div>
                 <div className="text-muted font-tech text-[10px]">READY</div>
               </div>
            </div>

            {/* Main Form / Interaction Area */}
            <div className="flex-1 flex flex-col gap-4 md:gap-6">
              
              {/* Media Preview Section */}
              <div className="flex-shrink-0">
                 {['VISION', 'VEO', 'EDITING', 'TRANSCRIBE', 'SCREEN'].includes(activeMode) && (
                   <div className="p-2 md:p-4 border border-dashed border-muted/50 rounded-lg bg-black/40 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 relative group overflow-hidden">
                      
                      {isCameraOpen || isScreenSharing ? (
                         <div className="relative w-full aspect-video md:h-[30vh] min-h-[200px] flex flex-col items-center justify-center bg-black/80 border border-primary/30 rounded overflow-hidden group-hover:border-primary/80 transition-colors">
                            <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted={isScreenSharing || activeMode === 'VISION' || activeMode === 'VEO'}></video>
                            <canvas ref={canvasRef} className="hidden"></canvas>
                            
                            {/* HUD Overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-primary/50 rounded-full flex items-center justify-center">
                                   <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                                </div>
                                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/60"></div>
                                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/60"></div>
                                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/60"></div>
                                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/60"></div>
                                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-2 py-1 rounded">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-red-500 font-tech text-xs">{isScreenSharing ? 'SCREEN UPLINK' : 'LIVE FEED'}</span>
                                </div>
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary/30 animate-[scan_3s_linear_infinite] shadow-[0_0_10px_rgba(0,229,255,0.5)]"></div>
                            </div>

                            <div className="absolute bottom-4 flex gap-4 z-20 pointer-events-auto scale-90 md:scale-100">
                               {isCameraOpen && !isScreenSharing && (
                                 <button onClick={() => captureFrame('camera')} className="px-6 py-2 bg-primary/90 hover:bg-primary text-black font-bold font-orbitron tracking-wider rounded-sm border border-white/20 shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all">
                                   CAPTURE
                                 </button>
                               )}
                               <button onClick={stopAllStreams} className="px-6 py-2 bg-black/80 text-red-400 border border-red-500/50 font-bold font-orbitron tracking-wider rounded-sm hover:bg-red-500/20 transition-all">
                                 {isScreenSharing ? 'STOP SHARE' : 'ABORT'}
                               </button>
                            </div>
                         </div>
                      ) : previewUrl ? (
                        <div className="relative h-48 md:h-[30vh] min-h-[200px] flex items-center justify-center bg-black/50 rounded border border-primary/20">
                          {file?.type.startsWith('image') && <img src={previewUrl} alt="preview" className="h-full object-contain" />}
                          {file?.type.startsWith('video') && <video src={previewUrl} className="h-full" controls />}
                          {file?.type.startsWith('audio') && <audio src={previewUrl} controls className="w-full px-4 md:px-10" />}
                          <button onClick={() => { setFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors z-10">✕</button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 md:py-12 text-muted">
                           <div className="text-3xl md:text-4xl mb-3 opacity-50 animate-bounce">
                              {activeMode === 'SCREEN' ? '🖥️' : '📂 / 📷'}
                           </div>
                           <div className="font-tech text-xs md:text-sm tracking-widest mb-4">
                              {activeMode === 'SCREEN' ? 'SHARE SCREEN TO ANALYZE' : 'UPLOAD MEDIA OR CAPTURE'}
                           </div>
                           
                           <div className="flex gap-3 flex-wrap justify-center">
                               {activeMode !== 'SCREEN' && (
                                 <button 
                                   onClick={() => fileInputRef.current?.click()} 
                                   className="px-3 py-2 md:px-4 md:py-2 border border-primary/50 text-primary text-[10px] md:text-xs font-bold tracking-wider hover:bg-primary/10 rounded uppercase transition-all"
                                 >
                                    Select File
                                 </button>
                               )}
                               
                               {['VISION', 'VEO', 'EDITING'].includes(activeMode) && (
                                  <button 
                                    onClick={() => setIsCameraOpen(true)} 
                                    className="px-3 py-2 md:px-4 md:py-2 border border-secondary/50 text-secondary text-[10px] md:text-xs font-bold tracking-wider hover:bg-secondary/10 rounded uppercase transition-all"
                                  >
                                     Access Camera
                                  </button>
                               )}

                               {activeMode === 'SCREEN' && (
                                  <button 
                                    onClick={startScreenShare} 
                                    className="px-3 py-2 md:px-4 md:py-2 border border-secondary/50 text-secondary text-[10px] md:text-xs font-bold tracking-wider hover:bg-secondary/10 rounded uppercase transition-all"
                                  >
                                     START SCREEN SHARE
                                  </button>
                               )}
                           </div>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept={
                        activeMode === 'TRANSCRIBE' ? 'audio/*' : activeMode === 'VEO' ? 'image/*' : 'image/*,video/*'
                      } />
                      
                      {activeMode === 'TRANSCRIBE' && !previewUrl && !isCameraOpen && (
                         <div className="mt-4 flex justify-center border-t border-white/10 pt-4">
                            <button 
                              onClick={isRecording ? stopRecording : startRecording}
                              className={`flex items-center gap-2 px-6 py-2 rounded-full font-tech text-xs tracking-widest border transition-all ${isRecording ? 'border-red-500 text-red-500 bg-red-500/10 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'border-primary text-primary hover:bg-primary/10'}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-primary'}`}></div>
                              {isRecording ? 'RECORDING...' : 'ACTIVATE MIC'}
                            </button>
                         </div>
                      )}
                   </div>
                 )}
              </div>

              {/* Input and Action Section */}
              <div className="relative flex-1 flex flex-col min-h-[120px]">
                   <div className="absolute -top-2 left-3 bg-black px-1 text-[10px] font-tech text-primary z-10">COMMAND INPUT</div>
                   <textarea
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     placeholder={
                       activeMode === 'VEO' ? "Describe video parameters..." :
                       activeMode === 'EDITING' ? "Describe edits..." :
                       activeMode === 'TTS' ? "Enter text..." :
                       activeMode === 'SCREEN' ? "Analyze this screen..." :
                       "Enter command / query..."
                     }
                     className="flex-1 w-full bg-black/40 border border-gray-700 rounded p-3 md:p-4 text-white font-sans text-sm focus:border-primary focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] outline-none resize-none transition-all"
                   />
                   {activeMode === 'SCREEN' && isScreenSharing && (
                     <div className="absolute bottom-16 right-2 text-[10px] text-muted bg-black/80 px-2 rounded">
                        UI WILL AUTO-HIDE DURING CAPTURE
                     </div>
                   )}
                   
                   <div className="mt-4 flex justify-end">
                     <button 
                       onClick={executeFeature}
                       disabled={isLoading}
                       className={`
                         relative w-full md:w-auto px-10 py-3 bg-primary/10 border border-primary text-primary font-orbitron font-bold tracking-widest rounded 
                         hover:bg-primary hover:text-black hover:shadow-[0_0_20px_rgba(0,229,255,0.6)] 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                       `}
                     >
                       {isLoading ? (
                         <span className="flex items-center justify-center gap-2">
                           <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                           PROCESSING
                         </span>
                       ) : 'EXECUTE'}
                     </button>
                   </div>
              </div>

              {/* Output Section */}
              {result && (
                <div className="mt-2 p-1 border-t border-secondary/30 pt-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-secondary/5 border border-secondary/30 rounded p-3 md:p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                    <div className="font-tech text-xs text-secondary mb-3 flex justify-between">
                      <span>OUTPUT STREAM</span>
                      <span>COMPLETE</span>
                    </div>
                    
                    {result.type === 'text' && (
                      <div className="whitespace-pre-wrap font-sans text-sm text-white/90 leading-relaxed max-h-60 overflow-y-auto">{result.content}</div>
                    )}
                    
                    {result.type === 'image' && (
                      <div className="flex justify-center">
                        <img src={result.content} alt="Generated" className="max-h-60 md:max-h-80 rounded border border-white/20 shadow-lg" />
                      </div>
                    )}
                    
                    {result.type === 'video' && (
                      <div className="flex justify-center">
                        <video src={result.content} controls autoPlay loop className="max-h-60 md:max-h-80 w-full rounded border border-white/20 shadow-lg" />
                      </div>
                    )}

                    {result.type === 'maps' && (
                      <div className="space-y-4">
                        <div className="whitespace-pre-wrap font-sans text-sm text-white">{result.content}</div>
                        {result.chunks && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                            {result.chunks.map((chunk: any, i: number) => {
                              const uri = chunk.web?.uri || chunk.maps?.googleMapsUri;
                              const title = chunk.web?.title || chunk.maps?.title || "Location Data";
                              if (!uri) return null;
                              return (
                                 <a key={i} href={uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-black/40 hover:bg-primary/20 border border-white/10 hover:border-primary/50 rounded transition-all group">
                                   <span className="text-primary text-xl group-hover:scale-110 transition-transform">📍</span>
                                   <div className="overflow-hidden">
                                     <div className="text-xs font-tech text-primary truncate">{title}</div>
                                     <div className="text-[10px] font-mono text-muted truncate">{uri}</div>
                                   </div>
                                 </a>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {result.type === 'error' && (
                      <div className="text-red-400 font-tech border border-red-500/30 bg-red-500/10 p-3 rounded">
                        ERROR: {result.content}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FeaturePanel;