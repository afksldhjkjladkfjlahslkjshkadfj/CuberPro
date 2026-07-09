import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Award, Flame, CheckCircle, ShieldAlert, Zap, BookOpen } from 'lucide-react';
import { UserProfile, BADGES } from '../types';
import { AlgorithmCase, ALGORITHM_LIBRARY } from '../data/algorithms';

interface StatsDashboardProps {
  userProfile: UserProfile | null;
  userProgressList: any[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  userProfile,
  userProgressList
}) => {
  // Aggregate stats from list
  const learnedCount = userProgressList.filter(p => p.status === 'mastered').length;
  const learningCount = userProgressList.filter(p => p.status === 'learning').length;
  const accuracy = userProfile?.accuracyRate || 94; // fallback mockup
  const totalReviews = userProfile?.totalReviews || 142;

  // Render weekly activity chart mock data representing real days
  const chartData = [
    { day: 'MON', reviews: 24, correct: 22 },
    { day: 'TUE', reviews: 42, correct: 38 },
    { day: 'WED', reviews: 18, correct: 17 },
    { day: 'THU', reviews: 35, correct: 34 },
    { day: 'FRI', reviews: 56, correct: 53 },
    { day: 'SAT', reviews: 29, correct: 28 },
    { day: 'SUN', reviews: 48, correct: 44 }
  ];

  // Subset mastery breakdown
  const subsetData = [
    { name: 'PLL Subset', mastered: learnedCount, total: ALGORITHM_LIBRARY.filter(a => a.subset === 'PLL').length },
    { name: 'OLL Subset', mastered: userProgressList.filter(p => p.status === 'mastered' && p.subset === 'OLL').length, total: ALGORITHM_LIBRARY.filter(a => a.subset === 'OLL').length },
  ];

  return (
    <div className="flex-1 p-8 bg-[#09090b] h-full overflow-y-auto select-none">
      
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Performance Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Visualize your algorithm retention curves, review volume, and milestone badges.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Stats Cards and Charts */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Bento Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-[#0c0c0e] border border-slate-800 p-5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Mastered</span>
              <p className="text-3xl font-bold text-white">{learnedCount}</p>
              <span className="text-[9px] text-green-400 font-semibold block mt-1">Algorithms</span>
            </div>

            <div className="bg-[#0c0c0e] border border-slate-800 p-5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Learning</span>
              <p className="text-3xl font-bold text-white">{learningCount}</p>
              <span className="text-[9px] text-indigo-400 font-semibold block mt-1">Active cards</span>
            </div>

            <div className="bg-[#0c0c0e] border border-slate-800 p-5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Accuracy</span>
              <p className="text-3xl font-bold text-white">{accuracy}%</p>
              <span className="text-[9px] text-indigo-400 font-semibold block mt-1">Srs retention</span>
            </div>

            <div className="bg-[#0c0c0e] border border-slate-800 p-5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Solves</span>
              <p className="text-3xl font-bold text-white">{totalReviews}</p>
              <span className="text-[9px] text-indigo-400 font-semibold block mt-1">Completed reviews</span>
            </div>

          </div>

          {/* Activity Chart container */}
          <div className="bg-[#0c0c0e] border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-white font-bold text-base mb-6">Weekly Review Distribution</h3>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#1e293b', borderRadius: '12px' }} 
                    labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#a5b4fc', fontSize: '11px' }}
                  />
                  <Bar dataKey="reviews" name="Total Reviews" fill="#312e81" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="correct" name="Passed Solves" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subset Mastery Breakdown */}
          <div className="bg-[#0c0c0e] border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-white font-bold text-base mb-6">Set Mastery Progress</h3>
            
            <div className="space-y-4">
              {subsetData.map(set => {
                const percent = Math.round((set.mastered / (set.total || 1)) * 100);
                return (
                  <div key={set.name} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>{set.name}</span>
                      <span className="text-indigo-400 font-bold">{set.mastered} / {set.total} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Badges & Achievements */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-[#0c0c0e] border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-white font-bold text-base mb-6">Achievement Badges</h3>
            
            <div className="space-y-4">
              {BADGES.map(badge => {
                // Determine completion condition
                let completed = false;
                if (badge.category === 'streak' && userProfile) {
                  completed = userProfile.longestStreak >= badge.conditionValue;
                } else if (badge.category === 'count') {
                  completed = totalReviews >= badge.conditionValue;
                } else if (badge.category === 'mastery') {
                  completed = learnedCount >= badge.conditionValue;
                }

                return (
                  <div 
                    key={badge.id}
                    className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                      completed 
                        ? 'bg-indigo-600/5 border-indigo-500/20' 
                        : 'bg-slate-900/30 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${
                      completed 
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${completed ? 'text-white' : 'text-slate-400'}`}>
                        {badge.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
