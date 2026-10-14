import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Search, X, AlertTriangle } from 'lucide-react';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_bytes: number;
  status: string;
  path: string;
  user: string;
}

export default function Processes() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'cpu' | 'memory'>('cpu');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProcesses();
    const interval = setInterval(loadProcesses, 3000);
    return () => clearInterval(interval);
  }, [sortBy, filter]);

  const loadProcesses = async () => {
    try {
      const procs = await invoke<ProcessInfo[]>('get_processes', {
        sort: sortBy,
        filter: filter || undefined,
      });
      setProcesses(procs);
    } catch (error) {
      console.error('Failed to load processes:', error);
    }
  };

  const handleTerminate = async (pid: number, name: string) => {
    if (
      !confirm(
        `Are you sure you want to terminate "${name}" (PID: ${pid})?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await invoke('terminate_process', { pid });
      await loadProcesses();
    } catch (error: any) {
      alert(`Failed to terminate process: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Processes</h1>
        <p className="text-gray-400 mt-1">View and manage running processes</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search processes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="name">Sort by Name</option>
          <option value="cpu">Sort by CPU</option>
          <option value="memory">Sort by Memory</option>
        </select>
      </div>

      {/* Process Table */}
      <div className="bg-dark-800 rounded-lg border border-dark-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  PID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  CPU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {processes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No processes found
                  </td>
                </tr>
              ) : (
                processes.map((proc) => (
                  <tr key={proc.pid} className="hover:bg-dark-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{proc.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={proc.path}>
                        {proc.path}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{proc.pid}</td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          proc.cpu_percent > 50
                            ? 'bg-red-900 text-red-200'
                            : proc.cpu_percent > 20
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-dark-700 text-gray-300'
                        }`}
                      >
                        {proc.cpu_percent.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{formatBytes(proc.memory_bytes)}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400">{proc.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleTerminate(proc.pid, proc.name)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
                      >
                        <X size={14} />
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-dark-700 border-t border-dark-600 text-sm text-gray-400">
          Showing {processes.length} processes
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-yellow-200">
          <strong>Warning:</strong> Terminating processes can cause data loss or system instability.
          Only terminate processes you recognize and understand.
        </div>
      </div>
    </div>
  );
}
