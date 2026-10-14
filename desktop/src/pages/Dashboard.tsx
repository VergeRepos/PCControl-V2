import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Cpu, HardDrive, Activity, Thermometer, Network } from 'lucide-react';

interface SystemInfo {
  hostname: string;
  os_version: string;
  cpu: { model: string; cores: number };
  memory: { total: number };
  uptime: number;
}

interface SystemStats {
  cpu: { usage_percent: number; temperature?: number };
  gpu: { usage_percent: number; temperature?: number };
  memory: { usage_percent: number };
  network: { download_bytes_per_sec: number; upload_bytes_per_sec: number };
}

export default function Dashboard() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    loadSystemInfo();
    loadStats();

    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemInfo = async () => {
    try {
      const info = await invoke<SystemInfo>('get_system_info');
      setSystemInfo(info);
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const loadStats = async () => {
    try {
      const newStats = await invoke<SystemStats>('get_system_stats');
      setStats(newStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatNetworkSpeed = (bytesPerSec: number) => {
    const mbps = (bytesPerSec * 8) / (1024 ** 2);
    return `${mbps.toFixed(1)} Mbps`;
  };

  if (!systemInfo || !stats) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{systemInfo.hostname}</h1>
        <p className="text-gray-400 mt-1">{systemInfo.os_version}</p>
        <p className="text-gray-500 text-sm mt-1">Uptime: {formatUptime(systemInfo.uptime)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CPU Card */}
        <StatCard
          title="CPU"
          icon={<Cpu className="text-blue-500" size={24} />}
          value={`${stats.cpu.usage_percent.toFixed(1)}%`}
          subtitle={systemInfo.cpu.model}
          progress={stats.cpu.usage_percent}
          temperature={stats.cpu.temperature}
        />

        {/* GPU Card */}
        <StatCard
          title="GPU"
          icon={<Activity className="text-green-500" size={24} />}
          value={`${stats.gpu.usage_percent.toFixed(1)}%`}
          subtitle="Graphics"
          progress={stats.gpu.usage_percent}
          temperature={stats.gpu.temperature}
        />

        {/* Memory Card */}
        <StatCard
          title="Memory"
          icon={<HardDrive className="text-purple-500" size={24} />}
          value={`${stats.memory.usage_percent.toFixed(1)}%`}
          subtitle={formatBytes(systemInfo.memory.total)}
          progress={stats.memory.usage_percent}
        />

        {/* Network Card */}
        <StatCard
          title="Network"
          icon={<Network className="text-orange-500" size={24} />}
          value={
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">↓</span>
                {formatNetworkSpeed(stats.network.download_bytes_per_sec)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-blue-400">↑</span>
                {formatNetworkSpeed(stats.network.upload_bytes_per_sec)}
              </div>
            </div>
          }
          subtitle="Upload / Download"
        />
      </div>

      <div className="mt-8 bg-dark-800 rounded-lg p-6 border border-dark-600">
        <h2 className="text-xl font-semibold text-white mb-4">System Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="CPU" value={`${systemInfo.cpu.model} (${systemInfo.cpu.cores} cores)`} />
          <InfoRow label="Memory" value={formatBytes(systemInfo.memory.total)} />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  subtitle: string;
  progress?: number;
  temperature?: number;
}

function StatCard({ title, icon, value, subtitle, progress, temperature }: StatCardProps) {
  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-white">{title}</span>
        </div>
        {temperature && (
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Thermometer size={16} />
            {temperature.toFixed(0)}°C
          </div>
        )}
      </div>

      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      <div className="text-sm text-gray-400 mb-3">{subtitle}</div>

      {progress !== undefined && (
        <div className="w-full bg-dark-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              progress > 80 ? 'bg-red-500' : progress > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div>
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  );
}
