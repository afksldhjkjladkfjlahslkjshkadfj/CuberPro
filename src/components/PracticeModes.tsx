import React, { useState, useEffect, useRef } from 'react';
import { Trophy, HelpCircle, Zap, ShieldAlert, Play, ArrowRight, CheckCircle2, Award, Flame, Timer, RefreshCw } from 'lucide-react';
import { AlgorithmCase, ALGORITHM_LIBRARY } from '../data/algorithms';
import { UserProgressDoc } from '../types';
import { CubeVisualizer } from './CubeVisualizer';

interface PracticeModesProps {
  userProgress: { [key: string]: UserProgressDoc };
  onSaveProgress: (caseId: string, updates: Partial<UserProgressDoc>) => void;
  onCompleteReview: (caseId: string, rating: number) => void;
  isAuthenticated: boolean;
  onLoginPrompt: () => void;
}

export const PracticeModes: React.FC<PracticeModesProps> = ({
  userProgress,
  onSaveProgress,
  onCompleteReview,
  isAuthenticated,
  onLoginPrompt,
}) => {
  const [activeMode, setActiveMode] = useState<string | null>(null);

  // Practice session states
  const [sessionQueue, setSessionQueue] = useState<AlgorithmCase[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  // Timer states (Execution Mode)
  const [timerRunning, setTimerRunning] = useState(false);
  const [time, setTime] = useState(0); // in ms
  const [timerStatus, setTimerStatus] = useState<'idle' | 'holding' | 'running' | 'complete'>('idle');
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const startStopwatch = () => {
    startTimeRef.current = Date.now() - time;
    setTimerRunning(true);
    setTimerStatus('running');
    timerRef.current = setInterval(() => {
      setTime(Date.now() - startTimeRef.current);
    }, 10);
  };

  const stopStopwatch = () => {
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerStatus('complete');
  };

  const resetStopwatch = () => {
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setTime(0);
    setTimerStatus('idle');
  };

  // Keyboard binding for spacebar timer
  useEffect(() => {
    if (activeMode !== 'execution') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (timerStatus === 'idle') {
          setTimerStatus('holding');
        } else if (timerStatus === 'running') {
          stopStopwatch();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (timerStatus === 'holding') {
          setTime(0);
          startStopwatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(timerRef.current);
    };
  }, [activeMode, timerStatus]);

  // Mode Initializations
  const startFlashcards = () => {
    // Select learning or mastered cases
    const queue = ALGORITHM_LIBRARY.filter(alg => {
      const prog = userProgress[alg.id];
      return prog && (prog.status === 'learning' || prog.status === 'mastered');
    });
    if (queue.length === 0) {
      // Fallback to all PLLs if nothing in learning yet
      setSessionQueue(ALGORITHM_LIBRARY.slice(0, 5));
    } else {
      setSessionQueue(queue.sort(() => Math.random() - 0.5));
    }
    setCurrentSessionIndex(0);
    setIsRevealed(false);
    setActiveMode('flashcards');
  };

  const startLearnNew = () => {
    // Select unlearned cases
    const queue = ALGORITHM_LIBRARY.filter(alg => {
      const prog = userProgress[alg.id];
      return !prog || prog.status === 'unlearned';
    });
    if (queue.length === 0) {
      setSessionQueue([ALGORITHM_LIBRARY[0]]);
    } else {
      setSessionQueue(queue.slice(0, 3));
    }
    setCurrentSessionIndex(0);
    setIsRevealed(false);
    setActiveMode('learn');
  };

  const startExecution = () => {
    const queue = ALGORITHM_LIBRARY.filter(alg => {
      const prog = userProgress[alg.id];
      return prog && (prog.status === 'learning' || prog.status === 'mastered');
    });
    if (queue.length === 0) {
      setSessionQueue([ALGORITHM_LIBRARY[0]]);
    } else {
      setSessionQueue(queue.sort(() => Math.random() - 0.5));
    }
    setCurrentSessionIndex(0);
    resetStopwatch();
    setActiveMode('execution');
  };

  const startWeakest = () => {
    // Sort by low easeFactor
    const weakAlgs = ALGORITHM_LIBRARY.filter(alg => {
      const prog = userProgress[alg.id];
      return prog && (prog.status === 'learning' || prog.status === 'mastered');
    }).sort((a, b) => {
      const progA = userProgress[a.id];
      const progB = userProgress[b.id];
      return (progA?.easeFactor || 2.5) - (progB?.easeFactor || 2.5);
    });

    if (weakAlgs.length === 0) {
      setSessionQueue(ALGORITHM_LIBRARY.slice(0, 3));
    } else {
      setSessionQueue(weakAlgs.slice(0, 5));
    }
    setCurrentSessionIndex(0);
    setIsRevealed(false);
    setActiveMode('weakest');
  };

  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    return totalSeconds.toFixed(2);
  };

  const handleNextInQueue = () => {
    setIsRevealed(false);
    setCurrentSessionIndex(prev => prev + 1);
    resetStopwatch();
  };

  const handleMarkAsLearning = (caseId: string) => {
    if (!isAuthenticated) {
      onLoginPrompt();
      return;
    }
    onSaveProgress(caseId, {
      status: 'learning',
      updatedAt: new Date(),
    });
    handleNextInQueue();
  };

  const activeAlg = sessionQueue[currentSessionIndex];

  return (
    <div className="flex-1 p-8 bg-[#09090b] h-full overflow-y-auto select-none">
      
      {/* Choose practice mode screen */}
      {!activeMode ? (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Practice Studio</h1>
            <p className="text-slate-400 text-sm mt-1">Accelerate muscle memory through highly focused exercise drills.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mode: Learn new cases */}
            <div 
              onClick={startLearnNew}
              className="bg-[#0c0c0e] border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5 transition-all group"
              id="mode-learn-card"
            >
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">Learn New Case</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Walk through algorithms that are currently in your unlearned queue. Generates a progressive daily learning roadmap.
              </p>
              <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-indigo-400">
                Start learning <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mode: Flashcards */}
            <div 
              onClick={startFlashcards}
              className="bg-[#0c0c0e] border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5 transition-all group"
              id="mode-flashcards-card"
            >
              <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">Recognition Flashcards</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Test your pattern recognition. See the top orientation grid first, guess the algorithm path, then check your recall correctness.
              </p>
              <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-orange-400">
                Start flashcards <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mode: Execution stopwatch timer */}
            <div 
              onClick={startExecution}
              className="bg-[#0c0c0e] border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5 transition-all group"
              id="mode-execution-card"
            >
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">Execution Timer</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Unleash speed. Use our spacebar-triggered speedsolving timer to test execution speed and save split-second timing records.
              </p>
              <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-green-400">
                Start timer <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mode: Weakest Cases */}
            <div 
              onClick={startWeakest}
              className="bg-[#0c0c0e] border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5 transition-all group"
              id="mode-weakest-card"
            >
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">Weakest Algorithms</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Smart query identifies algorithms where you score the lowest SuperMemo retention ease factor, and loops them back for review.
              </p>
              <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-red-400">
                Reinforce weak spots <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Active Practice screen */
        <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[500px]">
          
          <button 
            onClick={() => setActiveMode(null)}
            className="self-start text-xs font-bold text-indigo-400 hover:text-indigo-300 mb-6 flex items-center gap-1 cursor-pointer"
            id="back-practice-selection"
          >
            ← Leave Session
          </button>

          {/* Session Over */}
          {!activeAlg || currentSessionIndex >= sessionQueue.length ? (
            <div className="bg-[#0c0c0e] border border-indigo-500/20 rounded-2xl p-8 w-full text-center relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
              <CheckCircle2 className="w-14 h-14 text-indigo-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">Session Completed!</h2>
              <p className="text-slate-400 text-xs mt-2 mb-6">Excellent job! Your spaced repetition schedules have updated to secure high-accuracy recall.</p>
              <button
                onClick={() => setActiveMode(null)}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl"
                id="finish-session-btn"
              >
                Back to Practice Selection
              </button>
            </div>
          ) : (
            /* Active Card Render */
            <div className="bg-[#0c0c0e] border border-slate-800 rounded-3xl p-6 w-full flex flex-col justify-between min-h-[460px]">
              
              {/* Card Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-900">
                <span className="text-[10px] text-slate-500 uppercase font-bold">
                  {activeMode.toUpperCase()} MODE
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  Progress: {currentSessionIndex + 1}/{sessionQueue.length}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-4">
                  <CubeVisualizer caseId={activeAlg.id} subset={activeAlg.subset} puzzle={activeAlg.puzzle} size={110} />
                </div>

                <h2 className="text-2xl font-bold text-white">{activeAlg.name}</h2>
                <p className="text-xs text-slate-500">{activeAlg.subset} • {activeAlg.puzzle}</p>

                {/* MODE SPECIFIC RENDERS */}

                {activeMode === 'learn' && (
                  <div className="mt-5 w-full space-y-4">
                    <div className="bg-[#09090b] p-3 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-indigo-400 font-bold uppercase block mb-1">Recommended Moves</span>
                      <p className="font-mono text-base text-white tracking-wider font-semibold break-all">{activeAlg.recommended}</p>
                    </div>
                    {activeAlg.recognition && (
                      <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">{activeAlg.recognition}</p>
                    )}
                  </div>
                )}

                {activeMode === 'flashcards' && !isRevealed && (
                  <button
                    onClick={() => setIsRevealed(true)}
                    className="mt-6 px-5 py-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-bold transition-all"
                    id="flashcard-reveal"
                  >
                    Reveal Solution Moves
                  </button>
                )}

                {activeMode === 'flashcards' && isRevealed && (
                  <div className="mt-5 w-full space-y-3 animate-fade-in">
                    <div className="bg-[#09090b] p-3 rounded-xl border border-orange-500/20">
                      <p className="font-mono text-base text-white tracking-wider break-all">{activeAlg.recommended}</p>
                    </div>
                  </div>
                )}

                {activeMode === 'weakest' && !isRevealed && (
                  <button
                    onClick={() => setIsRevealed(true)}
                    className="mt-6 px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all"
                    id="weakest-reveal"
                  >
                    Recall Move Sequence
                  </button>
                )}

                {activeMode === 'weakest' && isRevealed && (
                  <div className="mt-5 w-full space-y-3 animate-fade-in">
                    <div className="bg-[#09090b] p-3 rounded-xl border-red-500/20">
                      <p className="font-mono text-base text-white tracking-wider break-all">{activeAlg.recommended}</p>
                    </div>
                  </div>
                )}

                {/* EXECUTION STOPWATCH TIMER */}
                {activeMode === 'execution' && (
                  <div className="mt-6 w-full flex flex-col items-center gap-4">
                    {/* Time screen display */}
                    <div className={`font-mono text-4xl font-black ${
                      timerStatus === 'holding' ? 'text-red-500' : timerStatus === 'running' ? 'text-green-400' : 'text-white'
                    }`}>
                      {formatTime(time)}s
                    </div>

                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                      {timerStatus === 'idle' ? 'Hold [Spacebar] or tap trigger to start. Release to solve.' : timerStatus === 'running' ? 'Press [Spacebar] or tap stop to halt the stopwatch.' : 'Complete! Tap below to log accuracy.'}
                    </p>

                    {/* Mobile manual click controls */}
                    <div className="flex gap-2">
                      {timerStatus === 'idle' && (
                        <button
                          onClick={startStopwatch}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg"
                        >
                          Manual Start
                        </button>
                      )}
                      {timerStatus === 'running' && (
                        <button
                          onClick={stopStopwatch}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg"
                        >
                          Stop Solves
                        </button>
                      )}
                      {timerStatus === 'complete' && (
                        <button
                          onClick={resetStopwatch}
                          className="px-4 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
                        >
                          Retry Timer
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Card Footer Controls */}
              <div className="pt-4 border-t border-slate-900 flex justify-end gap-2">
                {activeMode === 'learn' && (
                  <button
                    onClick={() => handleMarkAsLearning(activeAlg.id)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                    id="mark-learning-btn"
                  >
                    Add to Learning Queue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {activeMode === 'flashcards' && isRevealed && (
                  <div className="w-full grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { onCompleteReview(activeAlg.id, 1); handleNextInQueue(); }}
                      className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl"
                    >
                      Failed (Forgot)
                    </button>
                    <button
                      onClick={() => { onCompleteReview(activeAlg.id, 5); handleNextInQueue(); }}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                    >
                      Correct (Perfect)
                    </button>
                  </div>
                )}

                {activeMode === 'weakest' && isRevealed && (
                  <div className="w-full grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { onCompleteReview(activeAlg.id, 1); handleNextInQueue(); }}
                      className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl"
                    >
                      Failed (Forgot)
                    </button>
                    <button
                      onClick={() => { onCompleteReview(activeAlg.id, 5); handleNextInQueue(); }}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                    >
                      Correct (Perfect)
                    </button>
                  </div>
                )}

                {activeMode === 'execution' && timerStatus === 'complete' && (
                  <div className="w-full grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { onCompleteReview(activeAlg.id, 2); handleNextInQueue(); }}
                      className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl"
                    >
                      Fumbled
                    </button>
                    <button
                      onClick={() => { onCompleteReview(activeAlg.id, 5); handleNextInQueue(); }}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                    >
                      Smooth Recall
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
