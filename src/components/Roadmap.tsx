import React, { useState, useMemo, useEffect } from 'react';
import { ALGORITHM_LIBRARY, PUZZLES, AlgorithmCase } from '../data/algorithms';
import { CubeVisualizer } from './CubeVisualizer';
import { UserProgressDoc } from '../types';
import { 
  Search, Check, BookOpen, Award, ChevronDown, ChevronUp, 
  TrendingUp, Copy, CheckCircle2, Star, HelpCircle, ArrowRight,
  Layers, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Megaminx PLL standard groups in user's preferred learning sequence
const PREFERRED_ORDER = ['T', 'Y', 'N', 'B', 'D', 'F', 'W', 'M', 'V', 'J', 'P', 'R', 'G', 'C', 'S', 'I', 'L', 'X'];
const REMAINING_GROUPS = ['A', 'E', 'H', 'K', 'Q', 'U', 'Z'];

interface RoadmapProps {
  userProgress: { [key: string]: UserProgressDoc };
  onSaveProgress: (caseId: string, updates: Partial<UserProgressDoc>) => void;
  onSaveProgressBulk?: (updates: { caseId: string; updates: Partial<UserProgressDoc> }[]) => void;
  onLoginPrompt: () => void;
  isAuthenticated: boolean;
}

export const Roadmap: React.FC<RoadmapProps> = ({
  userProgress,
  onSaveProgress,
  onSaveProgressBulk,
  onLoginPrompt,
  isAuthenticated
}) => {
  const [selectedPuzzle, setSelectedPuzzle] = useState<string>('3x3');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlearned' | 'learning' | 'mastered'>('all');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'ZBLL-T': true,
    'A Permutations': true,
    'B Permutations': true,
    'CLL': true
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Wizard state
  const [isWizardExpanded, setIsWizardExpanded] = useState<boolean>(true);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [expandedWizardGroups, setExpandedWizardGroups] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Set initial selected cases when selected puzzle changes
  useEffect(() => {
    const learningCaseIds = ALGORITHM_LIBRARY
      .filter(alg => alg.puzzle === selectedPuzzle)
      .map(alg => alg.id)
      .filter(id => userProgress[id]?.status === 'learning');
    setSelectedCases(learningCaseIds);
  }, [selectedPuzzle, userProgress]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Filter algorithms of the active puzzle
  const activePuzzleAlgs = useMemo(() => {
    return ALGORITHM_LIBRARY.filter(alg => alg.puzzle === selectedPuzzle);
  }, [selectedPuzzle]);

  const getCasesForGroup = (letter: string) => {
    return activePuzzleAlgs.filter(alg => {
      if (alg.subset !== 'PLL') return false;
      const baseName = alg.id.replace('Mega-PLL-', '');
      return baseName.charAt(0).toUpperCase() === letter;
    });
  };

  const getCasesForGroupCount = (letter: string) => {
    return getCasesForGroup(letter).length;
  };

  const handleGroupUpdate = (groupLetter: string, status: 'unlearned' | 'learning' | 'mastered') => {
    const casesToUpdate = getCasesForGroup(groupLetter);
    if (onSaveProgressBulk) {
      const updates = casesToUpdate.map(alg => ({
        caseId: alg.id,
        updates: {
          status,
          puzzle: alg.puzzle,
          subset: alg.subset
        }
      }));
      onSaveProgressBulk(updates);
    } else {
      casesToUpdate.forEach(alg => {
        onSaveProgress(alg.id, {
          status,
          puzzle: alg.puzzle,
          subset: alg.subset
        });
      });
    }
  };

  const handleCaseSelectToggle = (caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId) 
        : [...prev, caseId]
    );
  };

  const handleGroupSelectToggle = (groupLetter: string) => {
    const cases = getCasesForGroup(groupLetter);
    const caseIds = cases.map(c => c.id);
    const allSelected = caseIds.length > 0 && caseIds.every(id => selectedCases.includes(id));

    if (allSelected) {
      // Deselect all of them
      setSelectedCases(prev => prev.filter(id => !caseIds.includes(id)));
    } else {
      // Select all of them
      setSelectedCases(prev => {
        const next = [...prev];
        caseIds.forEach(id => {
          if (!next.includes(id)) {
            next.push(id);
          }
        });
        return next;
      });
    }
  };

  const handleBulkUpdate = (caseIds: string[], status: 'unlearned' | 'learning' | 'mastered') => {
    setIsSaving(true);
    if (onSaveProgressBulk) {
      const updates = caseIds.map(id => {
        const alg = activePuzzleAlgs.find(c => c.id === id);
        return {
          caseId: id,
          updates: {
            status,
            puzzle: alg?.puzzle || selectedPuzzle,
            subset: alg?.subset || 'PLL'
          }
        };
      });
      onSaveProgressBulk(updates);
    } else {
      caseIds.forEach(id => {
        const alg = activePuzzleAlgs.find(c => c.id === id);
        if (alg) {
          onSaveProgress(id, {
            status,
            puzzle: alg.puzzle,
            subset: alg.subset
          });
        }
      });
    }
    setSelectedCases([]);
    setIsSaving(false);
  };

  // 2. Compute Statistics for the selected puzzle
  const stats = useMemo(() => {
    const total = activePuzzleAlgs.length;
    let learning = 0;
    let mastered = 0;

    activePuzzleAlgs.forEach(alg => {
      const prog = userProgress[alg.id];
      if (prog) {
        if (prog.status === 'learning') learning++;
        if (prog.status === 'mastered') mastered++;
      }
    });

    const unlearned = total - learning - mastered;
    const progressPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const learningPercent = total > 0 ? Math.round((learning / total) * 100) : 0;

    return { total, learning, mastered, unlearned, progressPercent, learningPercent };
  }, [activePuzzleAlgs, userProgress]);

  // 3. Group and Categorize Algorithms based on the selected puzzle
  const groupedSections = useMemo(() => {
    const sections: { [key: string]: AlgorithmCase[] } = {};

    activePuzzleAlgs.forEach(alg => {
      // Determine logical section name
      let sectionName = alg.subset;

      if (selectedPuzzle === 'Megaminx' && alg.subset === 'PLL') {
        // Separate Megaminx PLL into precise Permutation families
        const baseName = alg.id.replace('Mega-PLL-', '');
        const letter = baseName.charAt(0);
        switch (letter) {
          case 'A': sectionName = 'A Permutations (Corner 3-cycles)'; break;
          case 'B': sectionName = 'B Permutations (Edge 3-cycles)'; break;
          case 'C': sectionName = 'C Permutations (Corner-edge swaps)'; break;
          case 'D': sectionName = 'D Permutations (Corner-edge 3-cycles)'; break;
          case 'E': sectionName = 'E Permutations (Corner-edge swaps)'; break;
          case 'F': sectionName = 'F Permutations (Corner/Edge 4-cycles)'; break;
          case 'G': sectionName = 'G Permutations (Corner swap + edge 3-cycle)'; break;
          case 'H': sectionName = 'H Permutations (Double edge swaps)'; break;
          case 'I': sectionName = 'I Permutations (5-cycles)'; break;
          case 'J': case 'K': case 'L': case 'M': case 'N': case 'P': case 'Q': case 'R': case 'S': case 'T': case 'U': case 'V': case 'W': case 'X': case 'Y': case 'Z':
            sectionName = `${letter} Permutations`; break;
          default: sectionName = 'Other Permutations'; break;
        }
      } else if (selectedPuzzle === 'Megaminx' && alg.subset === 'OLL') {
        // Group Megaminx OLL by oriented edge counts
        const baseName = alg.id.replace('Mega-OLL-', '');
        const match = baseName.match(/^(\d+)/);
        const groupNum = match ? parseInt(match[1], 10) : 1;
        if (groupNum === 1) sectionName = 'OLL Group 1 (All edges oriented)';
        else if (groupNum <= 11) sectionName = 'OLL Group 2 (3 edges oriented)';
        else if (groupNum <= 21) sectionName = 'OLL Group 3 (2 edges oriented)';
        else sectionName = 'OLL Group 4 (1/0 edges oriented)';
      }

      // Initialize array if not present
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }

      // Filter by status and search keyword
      const progress = userProgress[alg.id];
      const status = progress ? progress.status : 'unlearned';

      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'unlearned' && status === 'unlearned') ||
        (statusFilter === 'learning' && status === 'learning') ||
        (statusFilter === 'mastered' && status === 'mastered');

      const matchesSearch = 
        searchQuery === '' || 
        alg.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        alg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        alg.recommended.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alg.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      if (matchesStatus && matchesSearch) {
        sections[sectionName].push(alg);
      }
    });

    // Remove empty sections
    const filteredSections: { [key: string]: AlgorithmCase[] } = {};
    Object.keys(sections).forEach(key => {
      if (sections[key].length > 0) {
        filteredSections[key] = sections[key];
      }
    });

    return filteredSections;
  }, [activePuzzleAlgs, userProgress, statusFilter, searchQuery, selectedPuzzle]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#09090b]" id="roadmap-container">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar">
        
        {/* Page title and descriptive text */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Learning Roadmap <span className="text-xs bg-indigo-600/30 text-indigo-400 font-medium px-2.5 py-1 rounded-full border border-indigo-500/20">Alpha</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Mark cases you know and build your custom active learning queue.
            </p>
          </div>

          {/* Puzzle Selectors */}
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1 self-start md:self-auto select-none">
            {PUZZLES.map(puzzle => {
              const isSelected = selectedPuzzle === puzzle.id;
              return (
                <button
                  key={puzzle.id}
                  onClick={() => setSelectedPuzzle(puzzle.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                  id={`puzzle-tab-${puzzle.id}`}
                >
                  {puzzle.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Progress Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          
          {/* General Mastery Ring Card */}
          <div className="bg-[#0e0e11] border border-slate-900/80 p-5 rounded-2xl flex items-center gap-5 md:col-span-2">
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-slate-900"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-indigo-500 transition-all duration-500"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - stats.progressPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold text-white">{stats.progressPercent}%</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Mastered</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-400">Mastery Progress</h3>
              <p className="text-2xl font-bold text-white tracking-tight">
                {stats.mastered} <span className="text-slate-500 text-sm font-medium">/ {stats.total} cases</span>
              </p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  {stats.mastered} Mastered
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                  {stats.learning} Learning
                </span>
              </div>
            </div>
          </div>

          {/* Active Learning Queue Card */}
          <div className="bg-[#0e0e11] border border-slate-900/80 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Queue</span>
              <BookOpen className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">{stats.learning}</span>
              <span className="text-slate-500 text-xs ml-1.5">cases learning</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-yellow-500 h-full rounded-full transition-all duration-300" 
                style={{ width: `${stats.learningPercent}%` }}
              />
            </div>
          </div>

          {/* Unlearned Library Card */}
          <div className="bg-[#0e0e11] border border-slate-900/80 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining</span>
              <HelpCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-slate-300 tracking-tight">{stats.unlearned}</span>
              <span className="text-slate-500 text-xs ml-1.5">cases left</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              Keep practicing to clear them!
            </div>
          </div>

        </div>

        {/* Megaminx PLL Batch Setup & Learning Queue Wizard */}
        {selectedPuzzle === 'Megaminx' && (() => {
          const allPLLCases = [...PREFERRED_ORDER, ...REMAINING_GROUPS].flatMap(letter => getCasesForGroup(letter)).map(c => c.id);
          const sequenceCases = PREFERRED_ORDER.flatMap(letter => getCasesForGroup(letter)).map(c => c.id);
          const areAllSelected = allPLLCases.length > 0 && allPLLCases.every(id => selectedCases.includes(id));

          return (
            <div className="bg-[#0b0b0e] border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl shadow-black/40 animate-fade-in" id="megaminx-pll-wizard">
              {/* Header / Trigger */}
              <div 
                onClick={() => setIsWizardExpanded(!isWizardExpanded)}
                className="px-6 py-4 bg-indigo-950/20 border-b border-indigo-500/10 flex items-center justify-between cursor-pointer hover:bg-indigo-950/35 transition-all select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight flex items-center gap-2">
                      Megaminx PLL Queue Organizer & Batch Manager
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Learning Flow
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select groups in your exact learning order (<span className="font-mono text-indigo-300">T, Y, N, B, D...</span>) to bulk add to queue or mark as already known.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {selectedCases.length > 0 && (
                    <span className="text-[10px] bg-indigo-600/40 text-indigo-200 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                      {selectedCases.length} cases selected
                    </span>
                  )}
                  {isWizardExpanded ? (
                    <ChevronUp className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence initial={false}>
                {isWizardExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 space-y-6"
                  >
                    {/* Bulk Action Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#070709] p-4 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            if (areAllSelected) {
                              setSelectedCases([]);
                            } else {
                              setSelectedCases(allPLLCases);
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-all cursor-pointer font-medium"
                        >
                          {areAllSelected ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCases(sequenceCases);
                          }}
                          className="px-2.5 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 border border-indigo-500/10 rounded-lg transition-all cursor-pointer font-medium"
                        >
                          Select Learning Sequence Only
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs text-slate-500 mr-1 hidden md:inline">Actions for selected:</span>
                        <button
                          disabled={selectedCases.length === 0 || isSaving}
                          onClick={() => handleBulkUpdate(selectedCases, 'mastered')}
                          className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 disabled:opacity-40 disabled:hover:bg-emerald-600/15 text-emerald-400 disabled:text-emerald-400/50 border border-emerald-500/20 disabled:border-emerald-500/10 hover:border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Already Know ({selectedCases.length} cases)
                        </button>
                        <button
                          disabled={selectedCases.length === 0 || isSaving}
                          onClick={() => handleBulkUpdate(selectedCases, 'learning')}
                          className="flex-1 sm:flex-none px-3.5 py-1.5 bg-yellow-500/15 hover:bg-yellow-500/25 disabled:opacity-40 disabled:hover:bg-yellow-500/15 text-yellow-400 disabled:text-yellow-400/50 border border-yellow-500/20 disabled:border-yellow-500/10 hover:border-yellow-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Add to Queue ({selectedCases.length} cases)
                        </button>
                        <button
                          disabled={selectedCases.length === 0 || isSaving}
                          onClick={() => handleBulkUpdate(selectedCases, 'unlearned')}
                          className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 disabled:text-slate-500 border border-slate-700/50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Dual Grid Layout: Sequences */}
                    <div className="space-y-6">
                      {/* Learning Sequence Grid */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                          <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            <span>🔄 Recommended Megaminx PLL Sequence (18 Groups)</span>
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono italic">Order: T, Y, N, B, D, F, W, M, V, J, P, R, G, C, S, I, L, X</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
                          {PREFERRED_ORDER.map((letter, index) => {
                            const cases = getCasesForGroup(letter);
                            const total = cases.length;
                            if (total === 0) return null;

                            const mastered = cases.filter(c => userProgress[c.id]?.status === 'mastered').length;
                            const learning = cases.filter(c => userProgress[c.id]?.status === 'learning').length;
                            
                            const caseIds = cases.map(c => c.id);
                            const isGroupFullySelected = caseIds.length > 0 && caseIds.every(id => selectedCases.includes(id));
                            const isGroupPartiallySelected = !isGroupFullySelected && caseIds.some(id => selectedCases.includes(id));
                            const isGroupExpanded = expandedWizardGroups.includes(letter);

                            return (
                              <div 
                                key={letter}
                                className={`bg-[#0d0d11] p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3.5 ${
                                  isGroupFullySelected 
                                    ? 'border-indigo-500 bg-indigo-950/15 shadow-md shadow-indigo-950/25' 
                                    : isGroupPartiallySelected
                                    ? 'border-indigo-500/50 bg-indigo-950/5'
                                    : mastered === total 
                                    ? 'border-emerald-500/20 bg-emerald-950/5' 
                                    : learning > 0
                                    ? 'border-yellow-500/20 bg-yellow-950/5'
                                    : 'border-slate-800/80 hover:border-slate-700 bg-slate-950/10'
                                }`}
                              >
                                {/* Header with Checkbox and Status */}
                                <div className="flex items-start justify-between gap-2">
                                  <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1">
                                    <input 
                                      type="checkbox"
                                      checked={isGroupFullySelected}
                                      ref={el => {
                                        if (el) el.indeterminate = isGroupPartiallySelected;
                                      }}
                                      onChange={() => handleGroupSelectToggle(letter)}
                                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-4 h-4 bg-slate-950 cursor-pointer mt-0.5"
                                    />
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-slate-500 font-bold">{index + 1}.</span>
                                        <span className="text-sm font-black text-slate-100">{letter}-Perm</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{total} cases</span>
                                    </div>
                                  </label>

                                  <div className="text-right flex-shrink-0">
                                    {mastered === total ? (
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
                                        Known
                                      </span>
                                    ) : learning > 0 ? (
                                      <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold px-1.5 py-0.5 rounded">
                                        {learning}/{total} learn
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-slate-900 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-transparent">
                                        New
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Progress bar visual */}
                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden flex">
                                  <div 
                                    className="bg-emerald-500 h-full transition-all" 
                                    style={{ width: `${(mastered / total) * 100}%` }}
                                    title={`${mastered} Mastered`}
                                  />
                                  <div 
                                    className="bg-yellow-500 h-full transition-all" 
                                    style={{ width: `${(learning / total) * 100}%` }}
                                    title={`${learning} Learning`}
                                  />
                                </div>

                                {/* Select Cases Link and selection summary */}
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedWizardGroups(prev => 
                                        prev.includes(letter) 
                                          ? prev.filter(x => x !== letter) 
                                          : [...prev, letter]
                                      );
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
                                  >
                                    {isGroupExpanded ? 'Hide Cases' : 'Select Cases'}
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  <span className="text-[9px] text-slate-500">
                                    {cases.filter(c => selectedCases.includes(c.id)).length}/{total} selected
                                  </span>
                                </div>

                                {/* Interactive cases list */}
                                <AnimatePresence>
                                  {isGroupExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-slate-900/60 pt-3 mt-1.5 space-y-2 max-h-48 overflow-y-auto custom-scrollbar"
                                    >
                                      {cases.map((c) => {
                                        const isCaseSelected = selectedCases.includes(c.id);
                                        const caseProg = userProgress[c.id];
                                        const caseStatus = caseProg?.status || 'unlearned';
                                        
                                        return (
                                          <div 
                                            key={c.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCaseSelectToggle(c.id);
                                            }}
                                            className={`p-2 rounded-lg border text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                              isCaseSelected 
                                                ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300 font-semibold' 
                                                : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-300'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={isCaseSelected}
                                                onChange={(e) => {
                                                  e.stopPropagation();
                                                  handleCaseSelectToggle(c.id);
                                                }}
                                                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-3.5 h-3.5 bg-slate-950 cursor-pointer"
                                              />
                                              <span className="text-[11px]">
                                                {c.id.replace('Mega-PLL-', '')}
                                              </span>
                                            </div>
                                            
                                            <div>
                                              {caseStatus === 'mastered' ? (
                                                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                  Known
                                                </span>
                                              ) : caseStatus === 'learning' ? (
                                                <span className="text-[8px] bg-yellow-500/10 text-yellow-400 font-bold px-1.5 py-0.5 rounded border border-yellow-500/20">
                                                  Queue
                                                </span>
                                              ) : (
                                                <span className="text-[8px] bg-slate-800 text-slate-500 font-semibold px-1.5 py-0.5 rounded">
                                                  New
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Action pill buttons */}
                                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-900/60 mt-1">
                                  <button
                                    onClick={() => handleGroupUpdate(letter, 'mastered')}
                                    className="py-1 px-1 bg-[#070709] hover:bg-emerald-500/10 text-[9px] text-slate-400 hover:text-emerald-400 border border-slate-800/80 hover:border-emerald-500/20 rounded font-semibold transition-all cursor-pointer text-center"
                                    title="Mark all as Mastered"
                                  >
                                    Know
                                  </button>
                                  <button
                                    onClick={() => handleGroupUpdate(letter, 'learning')}
                                    className="py-1 px-1 bg-[#070709] hover:bg-yellow-500/10 text-[9px] text-slate-400 hover:text-yellow-400 border border-slate-800/80 hover:border-yellow-500/20 rounded font-semibold transition-all cursor-pointer text-center"
                                    title="Add all to active Queue"
                                  >
                                    Queue
                                  </button>
                                  <button
                                    onClick={() => handleGroupUpdate(letter, 'unlearned')}
                                    className="py-1 px-1 bg-[#070709] hover:bg-slate-800 text-[9px] text-slate-500 hover:text-slate-300 border border-slate-800/80 hover:border-slate-700 rounded font-medium transition-all cursor-pointer text-center"
                                    title="Reset to unlearned"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Remaining Groups Grid */}
                      <div className="space-y-3 pt-4 border-t border-slate-900/80">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span>📦 Other Megaminx PLL Permutations (7 Groups)</span>
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
                          {REMAINING_GROUPS.map((letter) => {
                            const cases = getCasesForGroup(letter);
                            const total = cases.length;
                            if (total === 0) return null;

                            const mastered = cases.filter(c => userProgress[c.id]?.status === 'mastered').length;
                            const learning = cases.filter(c => userProgress[c.id]?.status === 'learning').length;
                            
                            const caseIds = cases.map(c => c.id);
                            const isGroupFullySelected = caseIds.length > 0 && caseIds.every(id => selectedCases.includes(id));
                            const isGroupPartiallySelected = !isGroupFullySelected && caseIds.some(id => selectedCases.includes(id));
                            const isGroupExpanded = expandedWizardGroups.includes(letter);

                            return (
                              <div 
                                key={letter}
                                className={`bg-[#0d0d11] p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                                  isGroupFullySelected 
                                    ? 'border-indigo-500 bg-indigo-950/15 shadow-md shadow-indigo-950/25' 
                                    : isGroupPartiallySelected
                                    ? 'border-indigo-500/50 bg-indigo-950/5'
                                    : mastered === total 
                                    ? 'border-emerald-500/20 bg-emerald-950/5' 
                                    : learning > 0
                                    ? 'border-yellow-500/20 bg-yellow-950/5'
                                    : 'border-slate-800/80 hover:border-slate-700 bg-slate-950/10'
                                }`}
                              >
                                {/* Header with Checkbox and Status */}
                                <div className="flex items-start justify-between gap-2">
                                  <label className="flex items-start gap-2 cursor-pointer select-none flex-1">
                                    <input 
                                      type="checkbox"
                                      checked={isGroupFullySelected}
                                      ref={el => {
                                        if (el) el.indeterminate = isGroupPartiallySelected;
                                      }}
                                      onChange={() => handleGroupSelectToggle(letter)}
                                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-3.5 h-3.5 bg-slate-950 cursor-pointer mt-0.5"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-200">{letter}-Perm</span>
                                      <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{total} cases</span>
                                    </div>
                                  </label>

                                  <div className="text-right flex-shrink-0">
                                    {mastered === total ? (
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
                                        Known
                                      </span>
                                    ) : learning > 0 ? (
                                      <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold px-1.5 py-0.5 rounded">
                                        {learning}/{total} learn
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-slate-900 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-transparent">
                                        New
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Progress bar visual */}
                                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden flex">
                                  <div 
                                    className="bg-emerald-500 h-full transition-all" 
                                    style={{ width: `${(mastered / total) * 100}%` }}
                                    title={`${mastered} Mastered`}
                                  />
                                  <div 
                                    className="bg-yellow-500 h-full transition-all" 
                                    style={{ width: `${(learning / total) * 100}%` }}
                                    title={`${learning} Learning`}
                                  />
                                </div>

                                {/* Select Cases Link and selection summary */}
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedWizardGroups(prev => 
                                        prev.includes(letter) 
                                          ? prev.filter(x => x !== letter) 
                                          : [...prev, letter]
                                      );
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
                                  >
                                    {isGroupExpanded ? 'Hide Cases' : 'Select Cases'}
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  <span className="text-[9px] text-slate-500">
                                    {cases.filter(c => selectedCases.includes(c.id)).length}/{total} selected
                                  </span>
                                </div>

                                {/* Interactive cases list */}
                                <AnimatePresence>
                                  {isGroupExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-slate-900/60 pt-2.5 mt-1 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar"
                                    >
                                      {cases.map((c) => {
                                        const isCaseSelected = selectedCases.includes(c.id);
                                        const caseProg = userProgress[c.id];
                                        const caseStatus = caseProg?.status || 'unlearned';
                                        
                                        return (
                                          <div 
                                            key={c.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCaseSelectToggle(c.id);
                                            }}
                                            className={`p-1.5 rounded-lg border text-left flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                                              isCaseSelected 
                                                ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300 font-semibold' 
                                                : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-300'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <input
                                                type="checkbox"
                                                checked={isCaseSelected}
                                                onChange={(e) => {
                                                  e.stopPropagation();
                                                  handleCaseSelectToggle(c.id);
                                                }}
                                                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-3 h-3 bg-slate-950 cursor-pointer"
                                              />
                                              <span className="text-[10px]">
                                                {c.id.replace('Mega-PLL-', '')}
                                              </span>
                                            </div>
                                            
                                            <div>
                                              {caseStatus === 'mastered' ? (
                                                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-bold px-1 py-0.5 rounded border border-emerald-500/20">
                                                  Known
                                                </span>
                                              ) : caseStatus === 'learning' ? (
                                                <span className="text-[8px] bg-yellow-500/10 text-yellow-400 font-bold px-1 py-0.5 rounded border border-yellow-500/20">
                                                  Queue
                                                </span>
                                              ) : (
                                                <span className="text-[8px] bg-slate-800 text-slate-500 font-semibold px-1 py-0.5 rounded">
                                                  New
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Action pill buttons */}
                                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-900/60 mt-1">
                                  <button
                                    onClick={() => handleGroupUpdate(letter, 'mastered')}
                                    className="py-1 px-1 bg-[#070709] hover:bg-emerald-500/10 text-[9px] text-slate-400 hover:text-emerald-400 border border-slate-800/80 hover:border-emerald-500/20 rounded font-semibold transition-all cursor-pointer text-center"
                                    title="Mark all as Mastered"
                                  >
                                    Know
                                  </button>
                                  <button
                                    onClick={() => handleGroupUpdate(letter, 'learning')}
                                    className="py-1 px-1 bg-[#070709] hover:bg-yellow-500/10 text-[9px] text-slate-400 hover:text-yellow-400 border border-slate-800/80 hover:border-yellow-500/20 rounded font-semibold transition-all cursor-pointer text-center"
                                    title="Add all to active Queue"
                                  >
                                    Queue
                                  </button>
                                  <button
                                    onClick={() => handleGroupUpdate(letter, 'unlearned')}
                                    className="py-1 px-1 bg-[#070709] hover:bg-slate-800 text-[9px] text-slate-500 hover:text-slate-300 border border-slate-800/80 hover:border-slate-700 rounded font-medium transition-all cursor-pointer text-center"
                                    title="Reset to unlearned"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0e0e11] p-4 rounded-xl border border-slate-900/80">
          
          {/* Status Filter Tabs */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-900">
            {[
              { id: 'all', label: 'All Cases' },
              { id: 'unlearned', label: 'Unlearned' },
              { id: 'learning', label: 'Learning' },
              { id: 'mastered', label: 'Mastered' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
                id={`status-tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID, name, algorithm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-white placeholder-slate-600 transition-all"
              id="roadmap-search-input"
            />
          </div>

        </div>

        {/* Grouped Sections List */}
        <div className="space-y-6">
          {Object.keys(groupedSections).length === 0 ? (
            <div className="text-center py-16 bg-[#0e0e11] border border-slate-900 rounded-2xl flex flex-col items-center justify-center">
              <Award className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-400 font-semibold text-sm">No cases matched your criteria.</p>
              <p className="text-slate-600 text-xs mt-1">Try resetting the status filter or searching with a different term.</p>
            </div>
          ) : (
            Object.keys(groupedSections).map((sectionKey) => {
              const isExpanded = expandedSections[sectionKey] !== false;
              const cases = groupedSections[sectionKey];
              
              // Count status within section
              const sectionMastered = cases.filter(c => userProgress[c.id]?.status === 'mastered').length;
              const sectionLearning = cases.filter(c => userProgress[c.id]?.status === 'learning').length;

              return (
                <div key={sectionKey} className="bg-[#0c0c0f] border border-slate-900 rounded-2xl overflow-hidden shadow-lg transition-all">
                  
                  {/* Collapsible Section Header */}
                  <div 
                    onClick={() => toggleSection(sectionKey)}
                    className="flex items-center justify-between px-5 py-4 bg-[#0e0e11] border-b border-slate-900 cursor-pointer hover:bg-slate-900/20 transition-all select-none"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="font-bold text-sm text-slate-200 tracking-tight">{sectionKey}</h2>
                      <span className="text-xs font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-500">
                        {cases.length} cases
                      </span>
                    </div>

                    <div className="flex items-center gap-5">
                      {/* Section Progress indicators */}
                      <div className="hidden sm:flex items-center gap-3 text-xs">
                        {sectionMastered > 0 && (
                          <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> {sectionMastered} Mastered
                          </span>
                        )}
                        {sectionLearning > 0 && (
                          <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 font-semibold">
                            {sectionLearning} Learning
                          </span>
                        )}
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Section content grid */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-5"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {cases.map((alg) => {
                            const progress = userProgress[alg.id];
                            const status = progress ? progress.status : 'unlearned';

                            return (
                              <div 
                                key={alg.id} 
                                className={`bg-[#0e0e12] border rounded-xl overflow-hidden p-4 flex flex-col justify-between transition-all duration-200 ${
                                  status === 'mastered' 
                                    ? 'border-emerald-500/20 shadow-emerald-500/5' 
                                    : status === 'learning'
                                    ? 'border-yellow-500/20 shadow-yellow-500/5'
                                    : 'border-slate-900/60'
                                }`}
                                id={`roadmap-card-${alg.id}`}
                              >
                                {/* Card Top Row */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 tracking-wider font-mono">
                                      {alg.id.replace('Mega-PLL-', '').replace('Mega-OLL-', '')}
                                    </span>
                                    {status === 'mastered' ? (
                                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Mastered
                                      </span>
                                    ) : status === 'learning' ? (
                                      <span className="text-[10px] bg-yellow-500/10 text-yellow-400 font-bold px-2 py-0.5 rounded border border-yellow-500/20">
                                        Learning
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-slate-900 text-slate-500 font-semibold px-2 py-0.5 rounded">
                                        New
                                      </span>
                                    )}
                                  </div>

                                  {/* Center Image Component */}
                                  <div className="flex items-center justify-center py-1">
                                    <CubeVisualizer
                                      caseId={alg.id}
                                      subset={alg.subset}
                                      puzzle={alg.puzzle}
                                      size={80}
                                    />
                                  </div>

                                  {/* Title and details */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-slate-200 truncate">{alg.name}</h4>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{alg.recognition}</p>
                                  </div>

                                  {/* Algorithm and Copy */}
                                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-900 flex items-center justify-between gap-1 select-all">
                                    <code className="text-[10px] font-semibold text-slate-300 font-mono tracking-tight truncate flex-1">
                                      {alg.recommended}
                                    </code>
                                    <button
                                      onClick={() => copyToClipboard(alg.recommended, alg.id)}
                                      className="text-slate-500 hover:text-white transition-all p-1 hover:bg-slate-900 rounded"
                                      title="Copy algorithm"
                                    >
                                      {copiedId === alg.id ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Status interactive buttons */}
                                <div className="mt-4 pt-3 border-t border-slate-900 grid grid-cols-3 gap-1 select-none">
                                  <button
                                    onClick={() => onSaveProgress(alg.id, { 
                                      status: 'unlearned',
                                      puzzle: alg.puzzle,
                                      subset: alg.subset
                                    })}
                                    className={`py-1 rounded text-[10px] font-bold border transition-all ${
                                      status === 'unlearned'
                                        ? 'bg-slate-900 text-slate-400 border-slate-800'
                                        : 'bg-transparent text-slate-600 hover:text-slate-400 border-transparent'
                                    }`}
                                  >
                                    Reset
                                  </button>
                                  <button
                                    onClick={() => onSaveProgress(alg.id, { 
                                      status: 'learning',
                                      puzzle: alg.puzzle,
                                      subset: alg.subset
                                    })}
                                    className={`py-1 rounded text-[10px] font-bold border transition-all ${
                                      status === 'learning'
                                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                        : 'bg-transparent text-slate-600 hover:text-yellow-400 border-transparent'
                                    }`}
                                  >
                                    Learn
                                  </button>
                                  <button
                                    onClick={() => onSaveProgress(alg.id, { 
                                      status: 'mastered',
                                      puzzle: alg.puzzle,
                                      subset: alg.subset
                                    })}
                                    className={`py-1 rounded text-[10px] font-bold border transition-all ${
                                      status === 'mastered'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-transparent text-slate-600 hover:text-emerald-400 border-transparent'
                                    }`}
                                  >
                                    Know
                                  </button>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
