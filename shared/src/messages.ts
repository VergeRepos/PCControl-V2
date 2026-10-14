// API Request and Response Types

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// System Information
export interface SystemInfo {
  hostname: string;
  os_version: string;
  cpu: CpuInfo;
  gpu: GpuInfo;
  memory: MemoryInfo;
  storage: StorageInfo[];
  uptime: number;
}

export interface CpuInfo {
  model: string;
  cores: number;
  threads: number;
}

export interface GpuInfo {
  model: string;
  memory: number;
}

export interface MemoryInfo {
  total: number;
  available: number;
}

export interface StorageInfo {
  drive: string;
  total: number;
  available: number;
  type: string;
}

// System Statistics
export interface SystemStats {
  timestamp: number;
  cpu: CpuStats;
  gpu: GpuStats;
  memory: MemoryStats;
  network: NetworkStats;
  disk: DiskStats;
}

export interface CpuStats {
  usage_percent: number;
  temperature?: number;
}

export interface GpuStats {
  usage_percent: number;
  temperature?: number;
  memory_used: number;
}

export interface MemoryStats {
  used: number;
  available: number;
  usage_percent: number;
}

export interface NetworkStats {
  download_bytes_per_sec: number;
  upload_bytes_per_sec: number;
}

export interface DiskStats {
  read_bytes_per_sec: number;
  write_bytes_per_sec: number;
}

// Process Information
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_bytes: number;
  status: string;
  path: string;
  user: string;
}

export interface ProcessListResponse {
  processes: ProcessInfo[];
  total: number;
}

// Power Control
export interface PowerActionRequest {
  force?: boolean;
  delay_seconds?: number;
}

export interface PowerActionResponse {
  success: boolean;
  message: string;
  action_id?: string;
}

// Applications
export interface Application {
  id: string;
  name: string;
  path: string;
  icon?: string;
}

export interface ApplicationListResponse {
  applications: Application[];
}

export interface LaunchApplicationResponse {
  success: boolean;
  pid?: number;
  message: string;
}

// File System
export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: number;
  permissions: string;
}

export interface DirectoryListResponse {
  path: string;
  entries: FileEntry[];
}

export interface FileOperationRequest {
  path: string;
}

export interface RenameFileRequest {
  old_path: string;
  new_path: string;
}

export interface FileOperationResponse {
  success: boolean;
  message?: string;
  path?: string;
  size?: number;
}

// Clipboard
export interface ClipboardContent {
  content: string;
  type: 'text';
  timestamp: number;
}

// Remote Input
export interface MouseMoveRequest {
  x: number;
  y: number;
  relative: boolean;
}

export interface MouseClickRequest {
  button: 'left' | 'right' | 'middle';
  action: 'click' | 'double' | 'down' | 'up';
}

export interface MouseScrollRequest {
  delta: number;
  horizontal: boolean;
}

export interface KeyboardInputRequest {
  text: string;
}

// Authentication
export interface PairingRequest {
  code: string;
  device_name: string;
  device_type: 'mobile';
}

export interface PairingResponse {
  device_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  secret: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Device Management
export interface Device {
  id: string;
  name: string;
  type: string;
  paired_at: number;
  last_seen?: number;
  permissions: DevicePermissions;
}

export interface DevicePermissions {
  system_monitoring: boolean;
  power_controls: boolean;
  process_control: boolean;
  application_launching: boolean;
  file_access: boolean;
  clipboard_sync: boolean;
  remote_input: boolean;
}

// Logging
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export enum LogCategory {
  API = 'API',
  AUTH = 'AUTH',
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
  PROCESS = 'PROCESS',
  POWER = 'POWER',
  FILE = 'FILE',
}

export interface LogEntry {
  id?: number;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  device_id?: string;
  metadata?: any;
}

// Error Codes
export enum ErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_CODE = 'INVALID_CODE',
  PAIRING_DISABLED = 'PAIRING_DISABLED',
  PROCESS_NOT_FOUND = 'PROCESS_NOT_FOUND',
  PROCESS_PROTECTED = 'PROCESS_PROTECTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  APP_NOT_FOUND = 'APP_NOT_FOUND',
  APP_ALREADY_RUNNING = 'APP_ALREADY_RUNNING',
  LAUNCH_FAILED = 'LAUNCH_FAILED',
}
