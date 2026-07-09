import React from 'react';
import { Flame, Compass, Play, BookOpen, AlertCircle, ArrowRight, Award, Plus, CheckCircle2 } from 'lucide-react';
import { AlgorithmCase, ALGORITHM_LIBRARY } from '../data/algorithms';
import { UserProgressDoc, UserProfile, BADGES } from '../types';
import { CubeVisualizer } from './CubeVisualizer';

interface DashboardProps {
  userProfile: UserProfile | null;
  userProgress: { [key: string]: UserProgressDoc };
  dailyAlgorithm: AlgorithmCase;
  dueCases: { alg: AlgorithmCase; progress: UserProgressDoc | null }[];
  onTriggerReview: () => void;
  onTriggerLearnDaily: () => void;
  onSkipDailyAlgorithm?: () => void;
  setView: (view: string) => void;
  onLoginPrompt: () => void;
  onSaveProgress: (caseId: string, updates: Partial<UserProgressDoc>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  userProfile,
  userProgress,
  dailyAlgorithm,
  dueCases,
  onTriggerReview,
  onTriggerLearnDaily,
  onSkipDailyAlgorithm,
  setView,
  onLoginPrompt,
  onSaveProgress,
}) => {
  const masteredCount = (Object.values(userProgress) as UserProgressDoc[]).filter(p => p.status === 'mastered').length;
  const learningCount = (Object.values(userProgress) as UserProgressDoc[]).filter(p => p.status === 'learning').length;
  const streak = userProfile?.streak || 0;
  const currentGoal = userProfile?.currentGoal || 'PLL';
  const dailyProgress = userProgress[dailyAlgorithm.id] || null;
  const isDailyLearned = dailyProgress?.status === 'mastered';

  // Get next unlearned algorithm in target subset for path progression
  const goalAlgorithms = ALGORITHM_LIBRARY.filter(alg => alg.subset === currentGoal);
  const totalInGoal = goalAlgorithms.length || 1;
  const masteredInGoal = goalAlgorithms.filter(alg => {
    return userProgress[alg.id]?.status === 'mastered';
  }).length;
  const progressPercent = Math.round((masteredInGoal / totalInGoal) * 100);

  const nextCaseInPath = goalAlgorithms.find(alg => {
    return !userProgress[alg.id] || userProgress[alg.id].status === 'unlearned';
  });

  const handleStartNextAlgorithm = () => {
    if (!nextCaseInPath) return;
    setView('library');
  };

  const handleSaveDailyAsLearning = () => {
    onSaveProgress(dailyAlgorithm.id, {
      status: 'learning',
      puzzle: dailyAlgorithm.puzzle,
      subset: dailyAlgorithm.subset,
    });
    alert(`"${dailyAlgorithm.name}" added to your learning queue!`);
  };

  return (
    <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#09090b] overflow-y-auto select-none">
      
      {/* Left Column: Challenges & SRS (8 Cols) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Hey, {userProfile?.displayName?.split(' ')[0] || 'Cuber'}!
            </h1>
            <p className="text-slate-400 text-sm mt-1">Ready to drill some fingertricks and master your muscle memory today?</p>
          </div>
        </div>

        {/* Daily Algorithm Card */}
        <div className="bg-gradient-to-br from-indigo-900/30 to-[#0c0c0e] border border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden shadow-lg shadow-indigo-600/5">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className={`px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold rounded ${
                  isDailyLearned 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/10' 
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {isDailyLearned ? '✓ Daily Challenge Mastered' : 'Daily Challenge'}
                </span>
                <h2 className="text-2xl font-black mt-2 text-white">{dailyAlgorithm.name}</h2>
                <p className="text-slate-400 text-xs mt-1">Algorithm {ALGORITHM_LIBRARY.findIndex(a => a.id === dailyAlgorithm.id) + 1} of {ALGORITHM_LIBRARY.length} ({dailyAlgorithm.subset} Subset)</p>
              </div>
              
              <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                <CubeVisualizer caseId={dailyAlgorithm.id} subset={dailyAlgorithm.subset} puzzle={dailyAlgorithm.puzzle} size={54} />
              </div>
            </div>

            <div className="mt-5 bg-[#09090b] p-4 rounded-xl border border-slate-800/80">
              <p className="font-mono text-base sm:text-lg text-indigo-100 tracking-wider font-semibold break-all select-all">
                {dailyAlgorithm.recommended}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {isDailyLearned ? (
                <>
                  <div className="px-4 py-2.5 bg-green-500/10 text-green-400 rounded-xl font-bold text-xs border border-green-500/10 flex items-center gap-1.5 select-none">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Challenge Mastered! Streak Active
                  </div>
                  <button 
                    onClick={() => setView('queue')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                    id="daily-queue-link-btn"
                  >
                    Manage Learning Queue
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={onTriggerLearnDaily}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                    id="daily-review-btn"
                  >
                    Learn Case Now
                  </button>
                  <button 
                    onClick={handleSaveDailyAsLearning}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs transition-all border border-slate-800 cursor-pointer"
                    id="daily-queue-btn"
                  >
                    Add to Learning Queue
                  </button>
                  {onSkipDailyAlgorithm && (
                    <button 
                      onClick={onSkipDailyAlgorithm}
                      className="px-5 py-2.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-500/10 hover:border-rose-500/25 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      id="daily-skip-btn"
                    >
                      I Already Know This
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Spaced Repetition Due Queue */}
          <div className="bg-[#0c0c0e] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-sm">Review Queue</h3>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 font-bold rounded-full border border-indigo-500/20">
                  {dueCases.length} Due Today
                </span>
              </div>

              {dueCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                  <p className="text-xs">All caught up! No algorithms due for review.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[148px] overflow-y-auto pr-1">
                  {dueCases.slice(0, 3).map((item) => (
                    <div 
                      key={item.alg.id}
                      className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                        <span className="text-xs font-semibold text-white">{item.alg.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 italic">
                        {item.progress?.repetitions ? `${item.progress.repetitions} reps` : 'Needs focus'}
                      </span>
                    </div>
                  ))}
                  {dueCases.length > 3 && (
                    <p className="text-[10px] text-center text-slate-500 font-medium">
                      + {dueCases.length - 3} more cases pending review
                    </p>
                  )}
                </div>
              )}
            </div>

            {dueCases.length > 0 && (
              <button
                onClick={onTriggerReview}
                className="w-full mt-4 py-2.5 bg-indigo-600/15 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                id="start-due-reviews-btn"
              >
                Launch Spaced-Repetition Review
              </button>
            )}
          </div>

          {/* Goal & Learning Progression Path */}
          <div className="bg-[#0c0c0e] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-white font-bold text-sm mb-4">Current Goal: Master {currentGoal}</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] mb-1.5 font-bold text-slate-400">
                    <span>Completion Progress</span>
                    <span className="text-indigo-400">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#1e293b]/50 border border-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                {nextCaseInPath ? (
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Up next in path</p>
                      <p className="text-sm font-bold text-white mt-0.5">{nextCaseInPath.name}</p>
                    </div>
                    <button 
                      onClick={handleStartNextAlgorithm}
                      className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                      id="next-in-path-btn"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl text-center">
                    <p className="text-xs text-green-400 font-bold">🎉 All {currentGoal} cases mastered!</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setView('library')}
              className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              id="view-full-goal-path-btn"
            >
              Explore Full Goal Path
            </button>
          </div>

        </div>

      </div>

      {/* Right Column: Global Profile & badging Achievements (4 Cols) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* User Stats Card */}
        <div className="bg-[#0c0c0e] border border-slate-800 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-5">Your Performance</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 text-center">
              <p className="text-2xl font-extrabold text-white">{masteredCount}</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold mt-1 tracking-wider">Algs Mastered</p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 text-center">
              <p className="text-2xl font-extrabold text-white">{userProfile?.accuracyRate || 94}%</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold mt-1 tracking-wider">Accuracy Rate</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-900 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Longest Streak</p>
                <p className="text-sm font-bold text-white mt-0.5">{userProfile?.longestStreak || 0} Days</p>
              </div>
            </div>
            
            <button 
              onClick={() => setView('statistics')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              id="analytics-dashboard-link"
            >
              Full Analytics →
            </button>
          </div>
        </div>

        {/* Milestone Badge Accomplishments */}
        <div className="bg-[#0c0c0e] border border-slate-800 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-4">Recent Milestones</h3>
          
          <div className="flex flex-wrap gap-2.5">
            {BADGES.slice(0, 3).map(badge => {
              // Simple check for badge completeness (mockup triggers based on streak or learned count)
              let completed = false;
              if (badge.category === 'streak' && streak >= badge.conditionValue) {
                completed = true;
              } else if (badge.category === 'count' && (userProfile?.totalReviews || 0) >= badge.conditionValue) {
                completed = true;
              } else if (badge.category === 'mastery' && masteredCount >= badge.conditionValue) {
                completed = true;
              }

              return (
                <div 
                  key={badge.id}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                    completed 
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-md shadow-indigo-600/10' 
                      : 'bg-slate-900/50 border-slate-800 text-slate-600 opacity-40'
                  }`}
                  title={`${badge.title}: ${badge.description}`}
                >
                  <Award className="w-5 h-5" />
                </div>
              );
            })}
            <div 
              onClick={() => setView('statistics')}
              className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs cursor-pointer hover:text-white hover:border-slate-700 transition-all"
            >
              +{BADGES.length - 3}
            </div>
          </div>

          <button 
            onClick={() => setView('statistics')}
            className="w-full mt-6 py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-300 border-t border-slate-900 pt-4"
            id="all-achievements-btn"
          >
            View All Achievements & Badges
          </button>
        </div>

      </div>

    </div>
  );
};
