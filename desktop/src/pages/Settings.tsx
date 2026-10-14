import { Settings as SettingsIcon, Info } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure application preferences</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-dark-800 rounded-lg p-8 border border-dark-600">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="text-blue-500" size={28} />
            <h2 className="text-2xl font-bold text-white">Application Settings</h2>
          </div>

          <div className="space-y-6">
            <SettingToggle
              label="Start on System Boot"
              description="Automatically start PC Control when Windows starts"
              checked={false}
              onChange={() => {}}
            />

            <SettingToggle
              label="Minimize to System Tray"
              description="Keep PC Control running in the background"
              checked={true}
              onChange={() => {}}
            />

            <SettingToggle
              label="Auto-accept Connections"
              description="Automatically accept connections from paired devices"
              checked={true}
              onChange={() => {}}
            />
          </div>
        </div>

        <div className="mt-6 bg-dark-800 rounded-lg p-6 border border-dark-600">
          <div className="flex items-center gap-3 mb-4">
            <Info className="text-blue-500" size={24} />
            <h3 className="text-xl font-bold text-white">About</h3>
          </div>

          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">Version:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">API Port:</span>
              <span className="font-medium">8421</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Protocol:</span>
              <span className="font-medium">HTTPS + WebSocket</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h4 className="font-medium text-white">{label}</h4>
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
