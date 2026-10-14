import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Key, Copy, RefreshCw, Shield } from 'lucide-react';

export default function Security() {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const code = await invoke<string>('generate_pairing_code');
      setPairingCode(code);

      // Clear code after 5 minutes
      setTimeout(() => {
        setPairingCode(null);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
      alert('Failed to generate pairing code');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Security & Pairing</h1>
        <p className="text-gray-400 mt-1">Pair new devices and manage security settings</p>
      </div>

      {/* Pairing Section */}
      <div className="max-w-2xl">
        <div className="bg-dark-800 rounded-lg p-8 border border-dark-600">
          <div className="flex items-center gap-3 mb-6">
            <Key className="text-blue-500" size={28} />
            <h2 className="text-2xl font-bold text-white">Device Pairing</h2>
          </div>

          {!pairingCode ? (
            <>
              <p className="text-gray-300 mb-6">
                Generate a one-time pairing code to connect a new mobile device. The code will be valid
                for 5 minutes.
              </p>

              <button
                onClick={generateCode}
                disabled={generating}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={20} className={generating ? 'animate-spin' : ''} />
                Generate Pairing Code
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-300 mb-4">
                Enter this code in your mobile app to pair it with this PC:
              </p>

              <div className="bg-dark-900 border-2 border-blue-500 rounded-lg p-8 mb-6 text-center">
                <div className="text-6xl font-bold text-white tracking-wider mb-2 font-mono">
                  {pairingCode}
                </div>
                <div className="text-sm text-gray-400">Code expires in 5 minutes</div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={copyCode}
                  className="flex-1 px-6 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy size={20} />
                  Copy Code
                </button>
                <button
                  onClick={() => setPairingCode(null)}
                  className="flex-1 px-6 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 bg-dark-800 rounded-lg p-6 border border-dark-600">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-green-500" size={24} />
            <h3 className="text-xl font-bold text-white">Security Information</h3>
          </div>

          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>All communication is encrypted using TLS</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Pairing codes are single-use and expire after 5 minutes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Each device has granular permissions you can control</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>All actions are logged and can be reviewed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>You can revoke device access at any time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
