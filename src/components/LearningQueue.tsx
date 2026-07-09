import React, { useState } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Search, 
  Plus, 
  HelpCircle, 
  Sparkles, 
  Layers, 
  Play, 
  Check, 
  Info,
  ChevronDown,
  Shuffle,
  XCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ALGORITHM_LIBRARY, AlgorithmCase } from '../data/algorithms';
import { UserProfile, UserProgressDoc } from '../types';
import { CubeVisualizer } from './CubeVisualizer';

interface LearningQueueProps {
  userProfile: UserProfile | null;
  userProgress: { [key: string]: UserProgressDoc };
  onUpdateQueue: (newQueue: string[]) => void;
  onSaveProgress: (caseId: string, updates: Partial<UserProgressDoc>) => void;
}

export const LearningQueue: React.FC<LearningQueueProps> = ({
  userProfile,
  userProgress,
  onUpdateQueue,
  onSaveProgress
}) => {
  const queueIds = userProfile?.learningQueue || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');

  // Resolve full algorithm objects from queue IDs
  const queueItems = queueIds
    .map(id => ALGORITHM_LIBRARY.find(alg => alg.id === id))
    .filter((alg): alg is AlgorithmCase => !!alg);

  // Filter unlearned algorithms that are NOT already in the queue to allow adding them
  const availableToAdd = ALGORITHM_LIBRARY.filter(alg => {
    const isAlreadyInQueue = queueIds.includes(alg.id);
    const progress = userProgress[alg.id];
    const isUnlearned = !progress || progress.status !== 'mastered';
    
    if (isAlreadyInQueue || !isUnlearned) return false;

    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      alg.name.toLowerCase().includes(q) ||
      alg.subset.toLowerCase().includes(q) ||
      alg.puzzle.toLowerCase().includes(q) ||
      alg.recommended.toLowerCase().includes(q)
    );
  });

  // Reordering functions
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const nextQueue = [...queueIds];
    const temp = nextQueue[index];
    nextQueue[index] = nextQueue[index - 1];
    nextQueue[index - 1] = temp;
    onUpdateQueue(nextQueue);
  };

  const handleMoveDown = (index: number) => {
    if (index === queueIds.length - 1) return;
    const nextQueue = [...queueIds];
    const temp = nextQueue[index];
    nextQueue[index] = nextQueue[index + 1];
    nextQueue[index + 1] = temp;
    onUpdateQueue(nextQueue);
  };

  const handleMoveToTop = (index: number) => {
    if (index === 0) return;
    const nextQueue = [...queueIds];
    const [item] = nextQueue.splice(index, 1);
    nextQueue.unshift(item);
    onUpdateQueue(nextQueue);
  };

  const handleRemove = (caseId: string) => {
    const nextQueue = queueIds.filter(id => id !== caseId);
    onUpdateQueue(nextQueue);
    
    // Also update the case status to 'unlearned' if it was in 'learning'
    if (userProgress[caseId]?.status === 'learning') {
      onSaveProgress(caseId, { status: 'unlearned' });
    }
  };

  const handleAddToQueue = (caseId: string, alg: AlgorithmCase) => {
    if (queueIds.includes(caseId)) return;
    const nextQueue = [...queueIds, caseId];
    onUpdateQueue(nextQueue);

    // Mark status as 'learning'
    onSaveProgress(caseId, {
      status: 'learning',
      puzzle: alg.puzzle,
      subset: alg.subset
    });
  };

  const handleShuffle = () => {
    if (queueIds.length <= 1) return;
    const shuffled = [...queueIds].sort(() => Math.random() - 0.5);
    onUpdateQueue(shuffled);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your learning queue? All cases will be set back to unlearned.')) {
      onUpdateQueue([]);
      // Set all learning cases in the queue back to unlearned
      queueIds.forEach(id => {
        if (userProgress[id]?.status === 'learning') {
          onSaveProgress(id, { status: 'unlearned' });
        }
      });
    }
  };

  return (
    <div className="flex-1 p-8 bg-[#09090b] overflow-y-auto select-none flex flex-col h-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between justify-start gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-500" />
            <span>Learning Queue</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Reorder and manage your target speedcubing algorithms in a unified learning schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'view' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Queue ({queueItems.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'add' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Algorithms
          </button>
        </div>
      </div>

      {/* Daily schedule alert explanation */}
      <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-2xl mb-6 flex gap-3.5 items-start">
        <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 shrink-0 mt-0.5">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-xs text-indigo-200">How the Queue Rules Your Learning Journey</h4>
          <p className="text-[11px] text-indigo-300/80 mt-1 leading-relaxed">
            Your learning queue operates <strong>across all puzzles</strong>. Every new day, CuberPro pulls the <strong>top case</strong> from this queue to be your <strong>Algorithm of the Day</strong>.
          </p>
          <ul className="list-disc list-inside text-[11px] text-indigo-300/70 mt-1.5 space-y-1">
            <li><strong>Learn it:</strong> Your daily active streak continues, and tomorrow you'll advance to the next case.</li>
            <li><strong>Miss it:</strong> Your streak resets, and the case stays as your challenge until learned.</li>
          </ul>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'view' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            
            {/* Queue Tools & Actions */}
            {queueItems.length > 0 && (
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900 mb-4 shrink-0">
                <span className="text-xs text-slate-400 font-medium">
                  {queueItems.length} algorithm{queueItems.length === 1 ? '' : 's'} scheduled in queue.
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShuffle}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Randomize the queue order"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                    Shuffle
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-1.5 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/30 text-rose-400 hover:text-rose-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Queue
                  </button>
                </div>
              </div>
            )}

            {queueItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#0c0c0e] border border-slate-800 rounded-3xl">
                <Layers className="w-12 h-12 text-slate-600 mb-3.5" />
                <h3 className="text-lg font-bold text-slate-200">Your Learning Queue is Empty</h3>
                <p className="text-slate-500 text-xs mt-1.5 max-w-sm">
                  Add some target speedcubing algorithms to control your learning sequence and set your daily challenges!
                </p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Browse & Add Algorithms
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0 pb-12">
                <AnimatePresence initial={false}>
                  {queueItems.map((alg, index) => {
                    const isFirst = index === 0;
                    const isLast = index === queueItems.length - 1;
                    const isDaily = index === 0; // Top is always the next/current daily algorithm

                    return (
                      <motion.div
                        key={alg.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className={`bg-[#0c0c0e] border p-4 rounded-2xl flex items-center justify-between gap-4 transition-all duration-200 ${
                          isDaily 
                            ? 'border-indigo-500 bg-indigo-950/5 shadow-md shadow-indigo-600/5' 
                            : 'border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Drag/Rank info */}
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shrink-0 select-none ${
                            isDaily 
                              ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' 
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}>
                            {index + 1}
                          </div>

                          <div className="w-12 h-12 bg-slate-950 rounded-xl border border-slate-800/60 overflow-hidden flex items-center justify-center shrink-0">
                            <CubeVisualizer caseId={alg.id} subset={alg.subset} puzzle={alg.puzzle} size={42} />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-white text-sm">{alg.name}</h3>
                              {isDaily && (
                                <span className="text-[9px] bg-indigo-500/25 text-indigo-200 border border-indigo-500/30 px-1.5 py-0.5 rounded font-black flex items-center gap-1 animate-pulse uppercase tracking-wider">
                                  <Sparkles className="w-2 h-2" /> Top of Queue
                                </span>
                              )}
                              <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-400 font-semibold rounded">
                                {alg.puzzle} · {alg.subset}
                              </span>
                            </div>
                            <p className="font-mono text-xs text-indigo-300 font-medium tracking-wide mt-1 select-all break-all">
                              {alg.recommended}
                            </p>
                          </div>
                        </div>

                        {/* Reordering and removal controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Move to Top */}
                          <button
                            disabled={isFirst}
                            onClick={() => handleMoveToTop(index)}
                            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move to top (Algorithm of the Day)"
                          >
                            <span className="text-[10px] font-bold px-0.5">Top</span>
                          </button>
                          
                          {/* Move Up */}
                          <button
                            disabled={isFirst}
                            onClick={() => handleMoveUp(index)}
                            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            disabled={isLast}
                            onClick={() => handleMoveDown(index)}
                            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-[1px] h-6 bg-slate-900 mx-1" />

                          {/* Remove */}
                          <button
                            onClick={() => handleRemove(alg.id)}
                            className="p-1.5 rounded-lg bg-rose-950/15 hover:bg-rose-950/35 text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/30 transition-all cursor-pointer"
                            title="Remove from learning queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

          </div>
        ) : (
          // Add algorithms tab
          <div className="flex-1 min-h-0 flex flex-col">
            
            {/* Search Input Bar */}
            <div className="relative mb-5 shrink-0">
              <span className="absolute left-3.5 top-3 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search case name, moves, subset (e.g. OLL, 3x3 PLL)..."
                className="w-full bg-[#0c0c0e] border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* List of cases to add */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-0 pb-12">
              {availableToAdd.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-[#0c0c0e] border border-slate-800 rounded-3xl">
                  <XCircle className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-slate-400 text-xs font-semibold">No available unlearned algorithms found.</p>
                  <p className="text-slate-600 text-[11px] mt-1">Try relaxing your search terms or verify cases aren't already in your queue or mastered.</p>
                </div>
              ) : (
                availableToAdd.slice(0, 50).map(alg => {
                  const hasProg = userProgress[alg.id];
                  const status = hasProg?.status || 'unlearned';

                  return (
                    <div 
                      key={alg.id}
                      className="bg-[#0c0c0e]/60 hover:bg-[#0c0c0e] border border-slate-800/60 hover:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-4 transition-all duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950 rounded-xl border border-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                          <CubeVisualizer caseId={alg.id} subset={alg.subset} puzzle={alg.puzzle} size={36} />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-white text-xs">{alg.name}</h3>
                            <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-1.5 py-0.2 rounded">
                              {alg.puzzle} · {alg.subset}
                            </span>
                            {status === 'learning' && (
                              <span className="text-[9px] bg-yellow-500/10 text-yellow-400 font-bold px-1.5 py-0.2 rounded border border-yellow-500/20">
                                In Practice
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-indigo-400 font-semibold tracking-wide mt-0.5 select-all break-all">
                            {alg.recommended}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToQueue(alg.id, alg)}
                        className="px-3 py-1.5 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        Add to Queue
                      </button>
                    </div>
                  );
                })
              )}
              {availableToAdd.length > 50 && (
                <p className="text-[10px] text-center text-slate-500 font-medium py-2">
                  Showing top 50 results. Narrow your search query to see more.
                </p>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
