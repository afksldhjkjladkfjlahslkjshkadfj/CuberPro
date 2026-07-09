import React from 'react';
import { LayoutDashboard, Compass, Trophy, BarChart3, Settings, LogOut, Flame, Milestone, Layers } from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  onLogin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  userProfile,
  onLogout,
  onLogin
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'queue', label: 'Learning Queue', icon: Layers },
    { id: 'roadmap', label: 'Roadmap', icon: Milestone },
    { id: 'library', label: 'Alg Library', icon: Compass },
    { id: 'practice', label: 'Practice', icon: Trophy },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 flex flex-col bg-[#0c0c0e] h-full justify-between select-none">
      <div className="flex flex-col">
        {/* Branding */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-900/50">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            Σ
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Cuber<span className="text-indigo-400">Pro</span>
          </h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
                id={`nav-${item.id}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Account Module */}
      <div className="p-4 border-t border-slate-800 bg-[#08080a]">
        {userProfile ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm select-none">
                {userProfile.displayName?.slice(0, 2).toUpperCase() || 'CU'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{userProfile.displayName}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                  {userProfile.streak} Day Streak
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
              id="sidebar-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="text-center p-2">
            <p className="text-xs text-slate-500 mb-3">Master algorithms with persistent cloud syncing.</p>
            <button
              onClick={onLogin}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              id="sidebar-login"
            >
              Sign In with Google
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
