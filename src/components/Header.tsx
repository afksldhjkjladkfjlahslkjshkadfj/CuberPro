import React from 'react';
import { Search, Flame, LogIn } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userProfile: UserProfile | null;
  onLogin: () => void;
  setView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  userProfile,
  onLogin,
  setView,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // If we're not currently on the library or search tab, optionally route them to search results
    if (e.target.value.trim() !== '') {
      // Allow searching from other tabs
      setView('library');
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-[#09090b] select-none">
      {/* Global Search */}
      <div className="relative w-96">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
          <Search className="w-4 h-4 text-slate-500" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full bg-[#0e0e11] border border-slate-800 rounded-full py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 transition-all"
          placeholder="Search algorithms (e.g., T-Perm, OLL 23)..."
          id="global-search-input"
        />
      </div>

      {/* Stats / Profile info */}
      <div className="flex items-center gap-6">
        {userProfile && userProfile.uid !== 'guest' && userProfile.email ? (
          <div className="flex items-center gap-4">
            {/* Streak Indicator */}
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-orange-400">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
              <span className="font-bold text-xs tracking-tight">{userProfile.streak} Day Streak</span>
            </div>

            {/* Simple Account Greeting */}
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
              Welcome, <span className="text-white font-semibold">{userProfile.displayName.split(' ')[0]}</span>
            </span>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-full text-xs font-semibold transition-all cursor-pointer"
            id="header-login-btn"
          >
            <LogIn className="w-3.5 h-3.5" />
            Connect Profile
          </button>
        )}
      </div>
    </header>
  );
};
