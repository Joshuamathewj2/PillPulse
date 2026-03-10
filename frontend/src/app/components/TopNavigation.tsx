import { Bell, Settings, User, Activity, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useState } from 'react';

export default function TopNavigation() {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);

  const handleSwitchRole = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left - Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl shadow-md group-hover:shadow-lg transition-shadow overflow-hidden">
              <img src="/logo.png" alt="PillPulse AI" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-lg">PillPulse AI</span>
              <span className="text-xs text-gray-500">Healthcare Assistant</span>
            </div>
          </Link>

          {/* Center - Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/">
              <Button
                variant={location.pathname === '/' ? 'secondary' : 'ghost'}
                className="gap-2"
              >
                <Activity className="w-4 h-4" />
                Chat
              </Button>
            </Link>
            <Link to="/symptom-checker">
              <Button
                variant={location.pathname === '/symptom-checker' ? 'secondary' : 'ghost'}
                className="gap-2"
              >
                Symptom Checker
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                variant={location.pathname === '/dashboard' ? 'secondary' : 'ghost'}
                className="gap-2"
              >
                Dashboard
              </Button>
            </Link>
            <Link to="/upload-prescription">
              <Button
                variant={location.pathname === '/upload-prescription' ? 'secondary' : 'ghost'}
                className="gap-2"
              >
                Upload Prescription
              </Button>
            </Link>
            <Link to="/actions">
              <Button
                variant={location.pathname === '/actions' ? 'secondary' : 'ghost'}
                className="gap-2"
              >
                Actions
              </Button>
            </Link>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="w-5 h-5" />
              </Button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50 overflow-hidden">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50 mb-1">
                    Settings
                  </div>
                  <button
                    onClick={handleSwitchRole}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Switch Role (Dev)
                  </button>
                </div>
              )}
            </div>
            <Avatar className="w-9 h-9 border-2 border-blue-100">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-500 text-white">
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </nav>
  );
}
