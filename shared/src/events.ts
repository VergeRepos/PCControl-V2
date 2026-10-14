// WebSocket Event Types

export enum WebSocketEventType {
  // Client -> Server
  AUTH = 'auth',
  PING = 'ping',

  // Server -> Client
  SYSTEM_STATS = 'system.stats',
  PROCESS_UPDATED = 'process.updated',
  CONNECTION_STATUS = 'connection.status',
  NOTIFICATION_CREATED = 'notification.created',
  POWER_STATE = 'power.state',
  CLIPBOARD_CHANGED = 'clipboard.changed',
  PONG = 'pong',
}

// Base WebSocket Message
export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
}

// Client Messages
export interface AuthMessage extends WebSocketMessage {
  type: WebSocketEventType.AUTH;
  token: string;
}

export interface PingMessage extends WebSocketMessage {
  type: WebSocketEventType.PING;
}

// Server Messages
export interface SystemStatsEvent extends WebSocketMessage {
  type: WebSocketEventType.SYSTEM_STATS;
  data: {
    timestamp: number;
    cpu: {
      usage_percent: number;
      temperature?: number;
    };
    gpu: {
      usage_percent: number;
      temperature?: number;
      memory_used?: number;
    };
    memory: {
      usage_percent: number;
      used?: number;
      available?: number;
    };
    network: {
      download_bytes_per_sec: number;
      upload_bytes_per_sec: number;
    };
    disk?: {
      read_bytes_per_sec: number;
      write_bytes_per_sec: number;
    };
  };
}

export interface ProcessUpdatedEvent extends WebSocketMessage {
  type: WebSocketEventType.PROCESS_UPDATED;
  data: {
    action: 'started' | 'terminated' | 'changed';
    pid: number;
    name: string;
  };
}

export interface ConnectionStatusEvent extends WebSocketMessage {
  type: WebSocketEventType.CONNECTION_STATUS;
  data: {
    status: 'connected' | 'disconnected' | 'error';
    message: string;
  };
}

export interface NotificationEvent extends WebSocketMessage {
  type: WebSocketEventType.NOTIFICATION_CREATED;
  data: {
    id: string;
    severity: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
  };
}

export interface PowerStateEvent extends WebSocketMessage {
  type: WebSocketEventType.POWER_STATE;
  data: {
    action: 'shutdown' | 'restart' | 'sleep' | 'hibernate' | 'lock' | 'logout';
    delay_seconds?: number;
    action_id: string;
  };
}

export interface ClipboardChangedEvent extends WebSocketMessage {
  type: WebSocketEventType.CLIPBOARD_CHANGED;
  data: {
    content: string;
    type: 'text';
    timestamp: number;
  };
}

export interface PongMessage extends WebSocketMessage {
  type: WebSocketEventType.PONG;
  timestamp: number;
}

// Union type for all events
export type ServerEvent =
  | SystemStatsEvent
  | ProcessUpdatedEvent
  | ConnectionStatusEvent
  | NotificationEvent
  | PowerStateEvent
  | ClipboardChangedEvent
  | PongMessage;

export type ClientMessage = AuthMessage | PingMessage;
