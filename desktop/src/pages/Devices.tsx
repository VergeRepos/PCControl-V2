import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Smartphone, Trash2, Key, Clock } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  device_type: string;
  paired_at: number;
  last_seen?: number;
  permissions: DevicePermissions;
}

interface DevicePermissions {
  system_monitoring: boolean;
  power_controls: boolean;
  process_control: boolean;
  application_launching: boolean;
  file_access: boolean;
  clipboard_sync: boolean;
  remote_input: boolean;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await invoke<Device[]>('get_devices');
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device? It will need to pair again.')) {
      return;
    }

    try {
      await invoke('revoke_device', { deviceId });
      loadDevices();
      setSelectedDevice(null);
    } catch (error) {
      console.error('Failed to revoke device:', error);
      alert('Failed to revoke device');
    }
  };

  const handlePermissionChange = async (permission: keyof DevicePermissions) => {
    if (!selectedDevice) return;

    const updatedPermissions = {
      ...selectedDevice.permissions,
      [permission]: !selectedDevice.permissions[permission],
    };

    try {
      await invoke('update_device_permissions', {
        deviceId: selectedDevice.id,
        permissions: updatedPermissions,
      });

      const updatedDevice = { ...selectedDevice, permissions: updatedPermissions };
      setSelectedDevice(updatedDevice);
      setDevices(devices.map((d) => (d.id === selectedDevice.id ? updatedDevice : d)));
    } catch (error) {
      console.error('Failed to update permissions:', error);
      alert('Failed to update permissions');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeSince = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Connected Devices</h1>
        <p className="text-gray-400 mt-1">Manage paired mobile devices and their permissions</p>
      </div>

      {devices.length === 0 ? (
        <div className="bg-dark-800 rounded-lg p-12 border border-dark-600 text-center">
          <Smartphone className="mx-auto text-gray-500 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-white mb-2">No devices paired</h3>
          <p className="text-gray-400">
            Go to Security → Pairing to generate a pairing code for your mobile device
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device List */}
          <div className="lg:col-span-1 space-y-3">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedDevice?.id === device.id
                    ? 'bg-blue-600 border-blue-500'
                    : 'bg-dark-800 border-dark-600 hover:border-dark-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Smartphone size={20} />
                  <span className="font-semibold text-white">{device.name}</span>
                </div>
                <div className="text-sm text-gray-400">
                  Last seen: {getTimeSince(device.last_seen)}
                </div>
              </button>
            ))}
          </div>

          {/* Device Details */}
          <div className="lg:col-span-2">
            {selectedDevice ? (
              <div className="bg-dark-800 rounded-lg p-6 border border-dark-600">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedDevice.name}</h2>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Key size={14} />
                        {selectedDevice.id}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        Paired {formatDate(selectedDevice.paired_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(selectedDevice.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={16} />
                    Revoke
                  </button>
                </div>

                <div className="border-t border-dark-600 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
                  <div className="space-y-3">
                    <PermissionToggle
                      label="System Monitoring"
                      description="View CPU, GPU, memory, and network stats"
                      checked={selectedDevice.permissions.system_monitoring}
                      onChange={() => handlePermissionChange('system_monitoring')}
                    />
                    <PermissionToggle
                      label="Power Controls"
                      description="Shutdown, restart, sleep, hibernate, lock"
                      checked={selectedDevice.permissions.power_controls}
                      onChange={() => handlePermissionChange('power_controls')}
                    />
                    <PermissionToggle
                      label="Process Control"
                      description="View and terminate running processes"
                      checked={selectedDevice.permissions.process_control}
                      onChange={() => handlePermissionChange('process_control')}
                    />
                    <PermissionToggle
                      label="Application Launching"
                      description="Launch allowed applications"
                      checked={selectedDevice.permissions.application_launching}
                      onChange={() => handlePermissionChange('application_launching')}
                    />
                    <PermissionToggle
                      label="File Access"
                      description="Browse and manage files in allowed directories"
                      checked={selectedDevice.permissions.file_access}
                      onChange={() => handlePermissionChange('file_access')}
                    />
                    <PermissionToggle
                      label="Clipboard Sync"
                      description="Synchronize clipboard content"
                      checked={selectedDevice.permissions.clipboard_sync}
                      onChange={() => handlePermissionChange('clipboard_sync')}
                    />
                    <PermissionToggle
                      label="Remote Input"
                      description="Control mouse and keyboard remotely"
                      checked={selectedDevice.permissions.remote_input}
                      onChange={() => handlePermissionChange('remote_input')}
                      warning
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-dark-800 rounded-lg p-12 border border-dark-600 text-center">
                <p className="text-gray-400">Select a device to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PermissionToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  warning?: boolean;
}

function PermissionToggle({ label, description, checked, onChange, warning }: PermissionToggleProps) {
  return (
    <div className="flex items-start justify-between p-4 bg-dark-700 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-white">{label}</h4>
          {warning && <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">Sensitive</span>}
        </div>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
