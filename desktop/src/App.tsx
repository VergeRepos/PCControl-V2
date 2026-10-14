import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Monitor, Smartphone, List, FileText, Settings, Shield, Activity, ChevronRight } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Processes from './pages/Processes';
import Security from './pages/Security';
import Settings from './pages/Settings';
import Logs from './pages/Logs';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-dark-900">
        {/* Sidebar */}
        <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col">
          <div className="p-6 border-b border-dark-600">
            <h1 className="text-2xl font-bold text-white">PC Control</h1>
            <p className="text-sm text-gray-400 mt-1">Remote Management</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavItem to="/" icon={<Monitor size={20} />} label="Dashboard" />
            <NavItem to="/devices" icon={<Smartphone size={20} />} label="Devices" />
            <NavItem to="/processes" icon={<Activity size={20} />} label="Processes" />
            <NavItem to="/security" icon={<Shield size={20} />} label="Security" />
            <NavItem to="/logs" icon={<FileText size={20} />} label="Logs" />
            <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
          </nav>

          <div className="p-4 border-t border-dark-600">
            <div className="text-xs text-gray-500">Version 1.0.0</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/processes" element={<Processes />} />
            <Route path="/security" element={<Security />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-dark-700 hover:text-white'
        }`
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
      <ChevronRight className="ml-auto" size={16} />
    </NavLink>
  );
}

export default App;
