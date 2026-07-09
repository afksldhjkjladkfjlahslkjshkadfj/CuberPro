import React, { useState, useEffect, useMemo } from 'react';
import { Search, Heart, Edit3, Save, CheckCircle, Flame, Plus, ChevronRight, X, ExternalLink, RefreshCw, Square, CheckSquare, Layers } from 'lucide-react';
import { AlgorithmCase, ALGORITHM_LIBRARY, PUZZLES } from '../data/algorithms';
import { UserProgressDoc } from '../types';
import { CubeVisualizer } from './CubeVisualizer';
import { getSpeedCubeDBUrl } from '../utils/srs';

interface AlgLibraryProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userProgress: { [key: string]: UserProgressDoc };
  onSaveProgress: (caseId: string, updates: Partial<UserProgressDoc>) => void;
  onLoginPrompt: () => void;
  isAuthenticated: boolean;
}

export const AlgLibrary: React.FC<AlgLibraryProps> = ({
  searchQuery,
  setSearchQuery,
  userProgress,
  onSaveProgress,
  onLoginPrompt,
  isAuthenticated
}) => {
  const [selectedPuzzle, setSelectedPuzzle] = useState<string>('3x3');
  const [selectedSubset, setSelectedSubset] = useState<string>('PLL');
  const [selectedCase, setSelectedCase] = useState<AlgorithmCase | null>(null);

  // States for user override drawer
  const [customPreferred, setCustomPreferred] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [customStatus, setCustomStatus] = useState<'unlearned' | 'learning' | 'mastered'>('unlearned');
  const [customIsFavorite, setCustomIsFavorite] = useState<boolean>(false);

  // Bulk Edit States
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  const activePuzzle = PUZZLES.find(p => p.id === selectedPuzzle) || PUZZLES[0];

  // When puzzle changes, reset bulk mode and subset selection
  useEffect(() => {
    setSelectedCaseIds([]);
    setIsBulkMode(false);
  }, [selectedPuzzle, selectedSubset]);

  // Filter cases based on selections and search query
  const filteredCases = ALGORITHM_LIBRARY.filter(item => {
    if (item.puzzle !== selectedPuzzle) return false;
    if (selectedSubset !== 'All' && item.subset !== selectedSubset) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSubset = item.subset.toLowerCase().includes(q);
      const matchRec = item.recommended.toLowerCase().includes(q);
      const matchTip = item.recognition.toLowerCase().includes(q);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
      return matchName || matchSubset || matchRec || matchTip || matchTags;
    }

    return true;
  });

  const groupedSections = useMemo(() => {
    const sections: { [key: string]: AlgorithmCase[] } = {};

    filteredCases.forEach(alg => {
      let sectionName = alg.subset;

      if (alg.puzzle === 'Megaminx' && alg.subset === 'PLL') {
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
      } else if (alg.puzzle === 'Megaminx' && alg.subset === 'OLL') {
        const baseName = alg.id.replace('Mega-OLL-', '');
        const match = baseName.match(/^(\d+)/);
        const groupNum = match ? parseInt(match[1], 10) : 1;
        if (groupNum === 1) sectionName = 'OLL Group 1 (All edges oriented)';
        else if (groupNum <= 11) sectionName = 'OLL Group 2 (3 edges oriented)';
        else if (groupNum <= 21) sectionName = 'OLL Group 3 (2 edges oriented)';
        else sectionName = 'OLL Group 4 (1/0 edges oriented)';
      }

      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(alg);
    });

    return sections;
  }, [filteredCases]);

  const handleSelectCase = (alg: AlgorithmCase) => {
    setSelectedCase(alg);
    const progress = userProgress[alg.id];
    setCustomPreferred(progress?.preferredAlg || alg.recommended);
    setCustomNotes(progress?.notes || '');
    setCustomStatus(progress?.status || 'unlearned');
    setCustomIsFavorite(progress?.isFavorite || false);
  };

  const handleCardClick = (item: AlgorithmCase) => {
    if (isBulkMode) {
      if (selectedCaseIds.includes(item.id)) {
        setSelectedCaseIds(selectedCaseIds.filter(id => id !== item.id));
      } else {
        setSelectedCaseIds([...selectedCaseIds, item.id]);
      }
    } else {
      handleSelectCase(item);
    }
  };

  const handleSelectAll = () => {
    setSelectedCaseIds(filteredCases.map(c => c.id));
  };

  const handleClearSelection = () => {
    setSelectedCaseIds([]);
  };

  const handleBulkStatusChange = (newStatus: 'unlearned' | 'learning' | 'mastered') => {
    if (!isAuthenticated) {
      onLoginPrompt();
      return;
    }
    if (selectedCaseIds.length === 0) return;

    selectedCaseIds.forEach(id => {
      const matchedCase = ALGORITHM_LIBRARY.find(c => c.id === id);
      if (matchedCase) {
        onSaveProgress(id, {
          status: newStatus,
          puzzle: matchedCase.puzzle,
          subset: matchedCase.subset,
        });
      }
    });

    // Reset bulk states
    setSelectedCaseIds([]);
    setIsBulkMode(false);
  };

  const handleSaveProgressDetails = () => {
    if (!isAuthenticated) {
      onLoginPrompt();
      return;
    }
    if (!selectedCase) return;

    onSaveProgress(selectedCase.id, {
      preferredAlg: customPreferred,
      notes: customNotes,
      status: customStatus,
      isFavorite: customIsFavorite,
      puzzle: selectedCase.puzzle,
      subset: selectedCase.subset,
    });

    // Close details
    setSelectedCase(null);
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'mastered':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'learning':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700/50';
    }
  };

  return (
    <div className="flex-1 flex bg-[#09090b] h-full overflow-hidden select-none relative">
      
      {/* Sidebar Filter and Grid */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        {/* Title Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Algorithm Library</h1>
            <p className="text-slate-400 text-sm mt-1">Explore, customize, and favorite twisty puzzle algorithm subsets.</p>
          </div>
          
          {/* Puzzle selector */}
          <div className="flex bg-[#0c0c0e] border border-slate-800 p-1 rounded-xl">
            {PUZZLES.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPuzzle(p.id);
                  setSelectedSubset(p.subsets[0] || 'All');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedPuzzle === p.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Subset Filters + Bulk Mode Activation */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6 pb-4 border-b border-slate-800/40">
          <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
            <button
              onClick={() => setSelectedSubset('All')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedSubset === 'All'
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Subsets
            </button>
            {activePuzzle.subsets.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubset(sub)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedSubset === sub
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center shrink-0">
            <button
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedCaseIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                isBulkMode
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              id="toggle-bulk-mode-btn"
            >
              <Layers className="w-3.5 h-3.5" />
              {isBulkMode ? 'Exit Bulk Edit' : 'Bulk Edit Status'}
            </button>
          </div>
        </div>

        {/* Bulk Action Subbar when Bulk Mode is active */}
        {isBulkMode && (
          <div className="mb-6 p-4 bg-slate-950 border border-indigo-500/10 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                {selectedCaseIds.length} Cases Selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-slate-400 hover:text-white font-medium underline cursor-pointer"
                  id="bulk-select-all"
                >
                  Select All
                </button>
                <span className="text-slate-700">•</span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-slate-400 hover:text-white font-medium underline cursor-pointer"
                  id="bulk-clear-selection"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatusChange('unlearned')}
                disabled={selectedCaseIds.length === 0}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer"
              >
                Mark Unlearned
              </button>
              <button
                onClick={() => handleBulkStatusChange('learning')}
                disabled={selectedCaseIds.length === 0}
                className="px-3 py-1.5 bg-indigo-600/15 hover:bg-indigo-600/35 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer"
              >
                Start Learning
              </button>
              <button
                onClick={() => handleBulkStatusChange('mastered')}
                disabled={selectedCaseIds.length === 0}
                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 hover:text-green-300 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer"
              >
                Mark Mastered
              </button>
            </div>
          </div>
        )}

        {/* Algorithms Grid */}
        {selectedPuzzle === 'Megaminx' && Object.keys(groupedSections).length > 1 && (
          <div className="sticky top-[-32px] z-30 -mx-8 px-8 py-3 bg-[#09090b]/95 backdrop-blur-md border-b border-slate-800/40 mb-6 flex flex-col gap-1.5 shadow-md shadow-black/20">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <span className="text-indigo-400">⚡ Quick Jump:</span>
              <span>Click a category below to scroll directly to it</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {Object.keys(groupedSections).map(sectionKey => {
                // Shorten name to first two words (e.g. "A Permutations", "OLL Group")
                const words = sectionKey.split(' ');
                const shortName = words.slice(0, 2).join(' ');
                const sectionId = `sec-${sectionKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
                return (
                  <button
                    key={sectionKey}
                    onClick={() => {
                      const el = document.getElementById(sectionId);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-3 py-1.5 bg-[#0c0c0e]/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-white rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-sm"
                  >
                    {shortName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filteredCases.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0c0c0e] rounded-2xl border border-slate-800/50">
            <p className="text-slate-500 text-sm">No algorithms match your criteria or search keywords.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedSubset('All'); }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8 pr-1">
            {Object.keys(groupedSections).map(sectionKey => {
              const cases = groupedSections[sectionKey];
              const sectionId = `sec-${sectionKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
              return (
                <div key={sectionKey} id={sectionId} className="space-y-4 scroll-mt-28">
                  <div className="sticky top-[38px] sm:top-[44px] z-20 bg-[#09090b]/95 backdrop-blur-md -mx-4 px-4 py-3 flex items-center gap-2.5 border-b border-slate-800/60 shadow-sm shadow-black/10">
                    <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{sectionKey}</h2>
                    <span className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800/60 px-2 py-0.5 rounded-full font-mono">
                      {cases.length} cases
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {cases.map(item => {
                      const progress = userProgress[item.id];
                      const isFavorite = progress?.isFavorite;
                      const currentAlg = progress?.preferredAlg || item.recommended;
                      const isSelected = selectedCaseIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleCardClick(item)}
                          className={`bg-[#0c0c0e] border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 cursor-pointer group relative ${
                            isBulkMode 
                              ? isSelected 
                                ? 'border-indigo-500 bg-indigo-950/10 ring-1 ring-indigo-500/30' 
                                : 'border-slate-800 hover:border-slate-700'
                              : 'border-slate-800 hover:border-indigo-500/30 hover:shadow-indigo-500/5'
                          }`}
                          id={`alg-card-${item.id}`}
                        >
                          {/* Select status indicator */}
                          {isBulkMode && (
                            <div className="absolute top-4 right-4 z-10 text-slate-500">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400 fill-indigo-400/10" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 hover:text-slate-500" />
                              )}
                            </div>
                          )}

                          <div className="flex gap-4">
                            {/* Image visualizer */}
                            <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-800">
                              <CubeVisualizer caseId={item.id} subset={item.subset} puzzle={item.puzzle} size={54} />
                            </div>

                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-white truncate text-base group-hover:text-indigo-400 transition-colors">
                                  {item.name}
                                </h3>
                                {!isBulkMode && isFavorite && (
                                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{item.subset} subset</p>
                              
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${getStatusBadgeColor(progress?.status)}`}>
                                  {progress?.status || 'unlearned'}
                                </span>
                                {item.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-slate-900 text-slate-500 text-[9px] font-semibold rounded">
                                    {tag}
                                  </span>
                                ))}
                                <a
                                  href={getSpeedCubeDBUrl(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-1.5 py-0.5 bg-indigo-950/40 hover:bg-indigo-600/35 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 text-[9px] font-semibold rounded flex items-center gap-1 transition-all duration-150"
                                  title="Train on SpeedCubeDB"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Train</span>
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Primary algorithm code */}
                          <div className="mt-4 bg-[#09090b] p-3 rounded-xl border border-slate-800/80">
                            <p className="font-mono text-xs text-indigo-200 truncate font-semibold tracking-wide">
                              {currentAlg}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-out details configuration drawer */}
      {selectedCase && !isBulkMode && (
        <div className="w-96 border-l border-slate-800 bg-[#0c0c0e] p-6 flex flex-col justify-between overflow-y-auto animate-slide-in select-none">
          
          {/* Drawer Top */}
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <CubeVisualizer caseId={selectedCase.id} subset={selectedCase.subset} puzzle={selectedCase.puzzle} size={48} />
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCase.name}</h2>
                  <p className="text-xs text-slate-500">{selectedCase.subset} subset • {selectedCase.puzzle}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCase(null)} 
                className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800"
                id="drawer-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SpeedCubeDB Training Link */}
            <a
              href={getSpeedCubeDBUrl(selectedCase)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-150 shadow-sm"
              id="drawer-speedcubedb-link"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Train Case on SpeedCubeDB</span>
            </a>

            {/* Favorite button and Learning Status toggler */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCustomIsFavorite(!customIsFavorite)}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold border transition-all cursor-pointer ${
                  customIsFavorite 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                id="drawer-fav-btn"
              >
                <Heart className={`w-4 h-4 ${customIsFavorite ? 'fill-rose-400' : ''}`} />
                {customIsFavorite ? 'Favorited' : 'Favorite'}
              </button>

              <select
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                id="drawer-status-select"
              >
                <option value="unlearned">Unlearned</option>
                <option value="learning">Learning (Due)</option>
                <option value="mastered">Mastered</option>
              </select>
            </div>

            {/* Preferred Overrides */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Preferred Algorithm</label>
              <textarea
                value={customPreferred}
                onChange={(e) => setCustomPreferred(e.target.value)}
                className="w-full bg-[#09090b] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 font-mono text-xs text-white min-h-[64px] resize-none"
                placeholder="Paste or write your custom finger-trick moves..."
                id="drawer-pref-alg-input"
              />
              <button 
                onClick={() => setCustomPreferred(selectedCase.recommended)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                id="drawer-reset-alg-btn"
              >
                <RefreshCw className="w-3 h-3" />
                Reset to standard recommended
              </button>
            </div>

            {/* Alternatives references */}
            {selectedCase.alternatives.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Alternatives solutions</span>
                <div className="space-y-1.5">
                  {selectedCase.alternatives.map((alt, i) => (
                    <div 
                      key={i} 
                      onClick={() => setCustomPreferred(alt)}
                      className="p-2.5 bg-slate-900/50 hover:bg-indigo-600/15 border border-slate-800 hover:border-indigo-500/20 rounded-lg font-mono text-[10px] text-slate-400 hover:text-indigo-300 cursor-pointer transition-all truncate"
                    >
                      {alt}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Personal Notes & Fingertricks</label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full bg-[#09090b] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-slate-300 min-h-[96px] resize-none"
                placeholder="Write finger-trick trigger guides, double flick cues, or recognition tips..."
                id="drawer-notes-input"
              />
            </div>
          </div>

          {/* Drawer Bottom Actions */}
          <div className="pt-6 border-t border-slate-900 space-y-2">
            {!isAuthenticated && (
              <p className="text-[10px] text-yellow-500 text-center mb-2">Connect profile first to save customized records.</p>
            )}
            <button
              onClick={handleSaveProgressDetails}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              id="drawer-save-btn"
            >
              Save customized details
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
