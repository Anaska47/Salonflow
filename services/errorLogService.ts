
export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppLog {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  message: string;
  user?: string;
  salon?: string;
  context?: string;
}

const STORAGE_KEY = 'salon_flow_logs';

class ErrorLogService {
  private logs: AppLog[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { this.logs = JSON.parse(saved); } catch (e) { this.logs = []; }
    }
  }

  subscribe(l: () => void) {
    this.listeners.push(l);
    return () => { this.listeners = this.listeners.filter(i => i !== l); };
  }

  private notify() {
    this.listeners.forEach(l => l());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, 50)));
  }

  log(severity: LogSeverity, message: string, context?: string, user?: string, salon?: string) {
    const newLog: AppLog = {
      id: 'log-' + Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      severity,
      message,
      context,
      user,
      salon
    };
    this.logs.unshift(newLog);
    this.notify();
    console.log(`[${severity.toUpperCase()}] ${message}`, context);
  }

  getLogs() { return this.logs; }
  
  clear() {
    this.logs = [];
    this.notify();
  }
}

export const errorLogService = new ErrorLogService();
