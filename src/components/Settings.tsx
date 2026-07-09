import React, { useState } from 'react';
import { Copy, Check, Info, Shield, Key, Eye, HelpCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsProps {
  userProfile: UserProfile | null;
  onSaveProfile: (updates: Partial<UserProfile>) => void;
  onLoginPrompt: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  userProfile,
  onSaveProfile,
  onLoginPrompt
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(userProfile?.displayName || '');
  const [currentGoalInput, setCurrentGoalInput] = useState(userProfile?.currentGoal || 'PLL');

  // Compute widget URL dynamically based on current origin
  const widgetUrl = userProfile 
    ? `${window.location.origin}/api/widget?userId=${userProfile.uid}`
    : 'Connect Google Profile first to generate your unique Widget URL';

  const handleCopyUrl = () => {
    if (!userProfile) return;
    navigator.clipboard.writeText(widgetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSavePreferences = () => {
    if (!userProfile) {
      onLoginPrompt();
      return;
    }
    onSaveProfile({
      displayName: displayNameInput,
      currentGoal: currentGoalInput
    });
    alert('User preferences saved successfully!');
  };

  // Pre-written Scriptable JS widget code block
  const scriptableCode = `// iOS Scriptable Widget for CuberPro
const url = "${userProfile ? widgetUrl : 'https://cuberpro-url/api/widget?userId=YOUR_ID'}";
const request = new Request(url);
const data = await request.loadJSON();

if (!data || !data.success) {
  throw new Error("Unable to load statistics");
}

let widget = new ListWidget();
widget.backgroundColor = new Color("#0c0c0e");

// Title
let titleText = widget.addText("Σ CUBERPRO");
titleText.textColor = new Color("#6366f1");
titleText.font = Font.boldSystemFont(11);
widget.addSpacer(4);

// Greeting
let greetText = widget.addText("Hey " + data.displayName + "!");
greetText.textColor = Color.white();
greetText.font = Font.semiboldSystemFont(14);
widget.addSpacer(8);

// Stats row
let streakText = widget.addText("🔥 Streak: " + data.streak + " Days");
streakText.textColor = new Color("#fb923c");
streakText.font = Font.boldSystemFont(11);

let progressText = widget.addText("📈 " + data.currentGoal + " Progress: " + data.progressPercentage + "%");
progressText.textColor = new Color("#a5b4fc");
progressText.font = Font.systemFont(10);

let reviewsText = widget.addText("🎯 Due Reviews: " + data.dueReviewsCount);
reviewsText.textColor = new Color("#38bdf8");
reviewsText.font = Font.systemFont(10);

widget.addSpacer(8);

// Today's Case
let caseHeader = widget.addText("TODAY'S CHALLENGE:");
caseHeader.textColor = new Color("#475569");
caseHeader.font = Font.boldSystemFont(8);

let caseName = widget.addText(data.todayAlgorithm.name);
caseName.textColor = Color.white();
caseName.font = Font.boldSystemFont(11);

Script.setWidget(widget);
Script.complete();
widget.presentSmall();`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptableCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex-1 p-8 bg-[#09090b] h-full overflow-y-auto select-none">
      
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Platform Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure your personal preferences, learning goals, and external integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Preferences */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-[#0c0c0e] border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              UserProfile Preferences
            </h3>

            {userProfile ? (
              <div className="space-y-4 pt-2">
                
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Display Name</label>
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full bg-[#09090b] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Enter your nickname"
                    id="settings-display-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Target Learning Goal</label>
                  <select
                    value={currentGoalInput}
                    onChange={(e) => setCurrentGoalInput(e.target.value)}
                    className="w-full bg-[#09090b] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    id="settings-goal-select"
                  >
                    <option value="PLL">Master PLL (Permute Last Layer)</option>
                    <option value="OLL">Master OLL (Orient Last Layer)</option>
                  </select>
                </div>

                <button
                  onClick={handleSavePreferences}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  id="settings-save-btn"
                >
                  Save settings
                </button>

              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                <p>Please connect your profile with Google login to view and adjust preferences.</p>
                <button
                  onClick={onLoginPrompt}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg"
                  id="settings-login-prompt-btn"
                >
                  Connect Profile
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: iOS Scriptable Widget */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-[#0c0c0e] border border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  iOS Widget Setup
                </h3>
                <p className="text-slate-500 text-[11px] mt-1">Integrate CuberPro stats into your iOS device using Scriptable.</p>
              </div>
            </div>

            {/* Widget URL */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Widget API Endpoint</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={widgetUrl}
                  className="flex-1 bg-[#09090b] border border-slate-800 rounded-xl px-4 py-2 text-[10px] text-slate-400 focus:outline-none truncate"
                  id="settings-widget-url"
                />
                {userProfile && (
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                    id="settings-copy-url-btn"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Scriptable Code Snippet */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Scriptable Javascript Code</label>
                <button
                  onClick={handleCopyCode}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  id="settings-copy-code-btn"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  Copy Widget Script
                </button>
              </div>
              <pre className="bg-[#09090b] border border-slate-800 p-3 rounded-xl font-mono text-[9px] text-slate-400 max-h-48 overflow-y-auto select-all leading-normal">
                {scriptableCode}
              </pre>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
