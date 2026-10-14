import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { FileText, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface LogEntry {
  id: number;
  timestamp: number;
  level: string;
  category: string;
  message: string;
  device_id?: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const entries = await invoke<LogEntry[]>('get_logs', {
        limit: 100,
        offset: 0,
      });
      setLogs(entries);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'WARN':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'INFO':
        return <Info className="text-blue-500" size={16} />;
      default:
        return <FileText className="text-gray-500" size={16} />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-400';
      case 'WARN':
        return 'text-yellow-400';
      case 'INFO':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Event Logs</h1>
        <p className="text-gray-400 mt-1">View system events and security logs</p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        <FilterButton
          label="All"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          count={logs.length}
        />
        <FilterButton
          label="Errors"
          active={filter === 'ERROR'}
          onClick={() => setFilter('ERROR')}
          count={logs.filter((l) => l.level === 'ERROR').length}
        />
        <FilterButton
          label="Warnings"
          active={filter === 'WARN'}
          onClick={() => setFilter('WARN')}
          count={logs.filter((l) => l.level === 'WARN').length}
        />
        <FilterButton
          label="Info"
          active={filter === 'INFO'}
          onClick={() => setFilter('INFO')}
          count={logs.filter((l) => l.level === 'INFO').length}
        />
      </div>

      {/* Logs */}
      <div className="bg-dark-800 rounded-lg border border-dark-600">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No logs found</div>
        ) : (
          <div className="divide-y divide-dark-700">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-dark-700 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getLogIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs font-medium ${getLogColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-xs text-gray-500">{log.category}</span>
                      <span className="text-xs text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-200">{log.message}</div>
                    {log.device_id && (
                      <div className="text-xs text-gray-500 mt-1">Device: {log.device_id}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}

function FilterButton({ label, active, onClick, count }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
      }`}
    >
      {label} <span className="text-sm opacity-75">({count})</span>
    </button>
  );
}
