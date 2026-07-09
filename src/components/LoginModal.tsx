import React, { useState } from 'react';
import { X, ShieldAlert, Zap, Globe, User, RefreshCw, ExternalLink } from 'lucide-react';
import { signInWithPopup, signInAnonymously, auth, googleProvider } from '../lib/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ADJECTIVES = ['Apex', 'Sub10', 'Aero', 'Flick', 'Hyper', 'Sonic', 'Zen', 'Mega', 'Matrix', 'Sprint', 'Omega'];
const NOUNS = ['Cuber', 'Flicker', 'Sune', 'Turner', 'Solver', 'Puzzler', 'Sticker', 'Tracker', 'Twister', 'Chamber'];

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateRandomName = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setNickname(`${adj}${noun}${num}`);
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const finalName = nickname.trim() || `ZenCuber${Math.floor(100 + Math.random() * 900)}`;
      
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      // Store nickname in local storage temporarily so syncUserProfile can read it
      localStorage.setItem(`guest_display_name_${user.uid}`, finalName);
      
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to sign in anonymously.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/web-storage-unsupported' || err?.message?.includes('iframe')) {
        setError('Google Sign-In is blocked by your browser inside this sandboxed preview iframe. To sign in with Google, click "Open in New Tab" at the top right of the screen! Otherwise, use the "Quick Guest Sign-In" below, which works instantly inside the iframe.');
      } else {
        setError(err?.message || 'Google Sign-In failed inside the iframe. Please try Quick Guest Sign-In below, or open the app in a new tab to use Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0c0c0e] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-900/60 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Connect Your Profile</h2>
            <p className="text-xs text-slate-400 mt-1">Choose how you would like to track your algorithms.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800/50"
            id="close-login-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Guest Form Area */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Quick Guest Nickname (Optional)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Sub10Sune, Speedcuber"
                    maxLength={20}
                    className="w-full bg-[#09090b] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 transition-all"
                    id="guest-nickname-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateRandomName}
                  className="px-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Generate random speedcubing nickname"
                  id="generate-nickname-btn"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold hidden sm:inline">Roll</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              id="guest-login-submit"
            >
              <Zap className="w-4 h-4 fill-white" />
              {loading ? 'Connecting...' : 'Quick Guest Sign-In (Recommended)'}
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800/80"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">or connect account</span>
            <div className="flex-grow border-t border-slate-800/80"></div>
          </div>

          {/* Social login buttons */}
          <div className="space-y-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              id="google-login-btn"
            >
              <Globe className="w-4 h-4" />
              Sign In with Google Account
            </button>

            {window.self !== window.top && (
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full py-2 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-900/30 text-indigo-400 hover:text-indigo-300 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                id="open-new-tab-login-btn"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open App in New Tab to Sign In
              </button>
            )}
          </div>
        </div>

        {/* Footer info banner */}
        <div className="p-4 bg-slate-950 border-t border-slate-900/80 text-[10px] text-slate-500 text-center leading-relaxed px-6">
          🔒 Guest mode saves all your learning progress to Firestore anonymously. Your data persists in your browser and on the cloud.
        </div>
      </div>
    </div>
  );
};
