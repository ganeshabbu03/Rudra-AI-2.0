
import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, LogEntry } from '../types';
import { base64ToUint8Array, decodeAudioData, createPcmBlob } from '../utils/audioUtils';
import { performDeviceAction, APP_SCHEMES, MOCK_CONTACTS } from '../utils/deviceIntegration';

// Define system tools
const systemControlTool: FunctionDeclaration = {
  name: 'systemControl',
  description: 'Execute system level commands or diagnostics.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: 'The command to execute. Options: "diagnostics", "scan_network", "optimize_memory", "toggle_security", "get_weather"',
      },
      target: {
        type: Type.STRING,
        description: 'Target specific subsystem if applicable (e.g., "firewall", "core_processor").',
      }
    },
    required: ['command'],
  },
};

const communicationTool: FunctionDeclaration = {
  name: 'communicationProtocol',
  description: 'Initiate calls or send messages to contacts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'The action to perform. Values: "call", "sms", "whatsapp".',
      },
      contactName: {
        type: Type.STRING,
        description: 'The name of the contact or phone number.',
      },
      messageContent: {
        type: Type.STRING,
        description: 'The content of the message (for sms/whatsapp).',
      }
    },
    required: ['action', 'contactName'],
  }
};

const appControlTool: FunctionDeclaration = {
  name: 'appControlProtocol',
  description: 'Open external applications or perform actions within them.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: 'The name of the app to open (e.g., Youtube, Spotify, Maps, Chrome).',
      },
      context: {
        type: Type.STRING,
        description: 'Optional context or search query to perform inside the app (e.g., song name, location, search term).',
      }
    },
    required: ['appName'],
  }
};

interface UseGeminiLiveProps {
  onLog: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
}

export const useGeminiLive = ({ onLog }: UseGeminiLiveProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isVolumeActive, setIsVolumeActive] = useState(false);
  
  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const stopAudio = useCallback(() => {
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    
    // Stop output
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      onLog('API Key missing.', 'error');
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      onLog('Initializing Neural Handshake...', 'info');

      // Initialize Audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            onLog('System Online. Voice Interface Active.', 'success');
            
            // Start Input Stream
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume detection for UI visualization
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
              const avg = sum / inputData.length;
              setIsVolumeActive(avg > 0.01);

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
            
            inputSourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
               const ctx = outputAudioContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const audioBuffer = await decodeAudioData(
                 base64ToUint8Array(audioData),
                 ctx,
                 24000,
                 1
               );
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               const gainNode = ctx.createGain();
               gainNode.gain.value = 1.2; // Boost volume slightly
               source.connect(gainNode);
               gainNode.connect(ctx.destination);
               
               source.addEventListener('ended', () => {
                 audioSourcesRef.current.delete(source);
               });
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               audioSourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              onLog('Interruption detected. Clearing buffer.', 'warning');
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                onLog(`Executing protocol: ${fc.name}`, 'warning');
                
                let result = { status: 'failed', details: 'Unknown command' };
                
                if (fc.name === 'systemControl') {
                    const cmd = (fc.args as any).command;
                    const target = (fc.args as any).target || 'general';
                    onLog(`RUNNING: ${cmd.toUpperCase()} on ${target.toUpperCase()}`, 'success');
                    result = { status: 'ok', details: `${cmd} completed successfully.` };
                }
                
                else if (fc.name === 'communicationProtocol') {
                    const args = fc.args as any;
                    onLog(`COMMS: ${args.action.toUpperCase()} -> ${args.contactName}`, 'info');
                    const actionResult = performDeviceAction(args.action, args.contactName, args.messageContent);
                    result = { 
                        status: actionResult.success ? 'ok' : 'failed', 
                        details: actionResult.message 
                    };
                    if(!actionResult.success) onLog(actionResult.message, 'error');
                    else onLog(actionResult.message, 'success');
                }

                else if (fc.name === 'appControlProtocol') {
                    const args = fc.args as any;
                    onLog(`LAUNCH: ${args.appName.toUpperCase()}`, 'info');
                    const actionResult = performDeviceAction('launch', args.appName, args.context);
                    result = {
                        status: actionResult.success ? 'ok' : 'failed',
                        details: actionResult.message
                    };
                    if(!actionResult.success) onLog(actionResult.message, 'error');
                    else onLog(actionResult.message, 'success');
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result }
                    }
                  });
                });
              }
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            onLog('Connection terminated.', 'info');
            stopAudio();
          },
          onerror: (e) => {
            console.error(e);
            setConnectionState(ConnectionState.ERROR);
            onLog('System Failure. Check Console.', 'error');
            stopAudio();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [systemControlTool, communicationTool, appControlTool] }],
          systemInstruction: `You are Rudra, a highly advanced AI assistant. 
          Your personality is helpful, witty, extremely intelligent, and efficient. 
          You have full control over this device's interfaces.
          
          CAPABILITIES:
          1. Call contacts using the 'communicationProtocol' tool with action='call'.
          2. Send SMS or WhatsApp messages using 'communicationProtocol' tool.
          3. Open any application on the device using 'appControlProtocol'.
          4. If asked to play music, search videos, or find locations, use 'appControlProtocol' with the 'context' parameter filled (e.g., appName='spotify', context='Imagine Dragons').

          Secure Contact List (simulated): ${MOCK_CONTACTS.map(c => c.name).join(', ')}.
          Supported Apps: ${Object.keys(APP_SCHEMES).join(', ')}.
          
          Keep responses concise and spoken naturally. When performing an action, confirm it verbally.`,
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error(error);
      setConnectionState(ConnectionState.ERROR);
      onLog(`Initialization Error: ${(error as Error).message}`, 'error');
    }
  }, [onLog, stopAudio]);

  const disconnect = useCallback(() => {
    if (sessionPromiseRef.current) {
         stopAudio();
         setConnectionState(ConnectionState.DISCONNECTED);
         sessionPromiseRef.current = null;
    }
  }, [stopAudio]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    connect,
    disconnect,
    connectionState,
    isVolumeActive
  };
};
