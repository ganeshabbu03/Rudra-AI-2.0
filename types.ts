export interface SystemStats {
  cpu: number;
  memory: number;
  network: number;
  temperature: number;
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  wind: string;
  location: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export type FeatureMode = 
  | 'NONE'
  | 'MAPS'
  | 'VEO'
  | 'VISION'
  | 'THINKING'
  | 'EDITING'
  | 'TTS'
  | 'TRANSCRIBE'
  | 'QUICK_CHAT'
  | 'SCREEN';