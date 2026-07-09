import React, { useState } from 'react';
import { X, Check, ArrowRight, Eye, ShieldAlert, Award, ExternalLink } from 'lucide-react';
import { AlgorithmCase } from '../data/algorithms';
import { UserProgressDoc } from '../types';
import { CubeVisualizer } from './CubeVisualizer';
import { getSpeedCubeDBUrl } from '../utils/srs';

interface SrsActiveReviewProps {
  dueCases: { alg: AlgorithmCase; progress: UserProgressDoc | null }[];
  onCompleteReview: (caseId: string, rating: number) => void;
  onClose: () => void;
}

export const SrsActiveReview: React.FC<SrsActiveReviewProps> = ({
  dueCases,
  onCompleteReview,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [reviewCount, setReviewCount] = useState(dueCases.length);

  if (dueCases.length === 0 || currentIndex >= dueCases.length) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
        <div className="bg-[#0c0c0e] border border-indigo-500/30 rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>
          
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-white">Queue Cleared!</h2>
          <p className="text-slate-400 text-sm mt-2 mb-6">
            You've completed all due reviews for today. Your algorithm retention stats have been synchronized with the cloud.
          </p>
          
          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
            id="review-complete-close-btn"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentItem = dueCases[currentIndex];
  const { alg, progress } = currentItem;

  const handleRatingSubmit = (rating: number) => {
    onCompleteReview(alg.id, rating);
    setIsRevealed(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const ratings = [
    { value: 0, label: 'Forgot', desc: 'Total blackout', color: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-400' },
    { value: 1, label: 'Incorrect', desc: 'Slight recall', color: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400' },
    { value: 2, label: 'Close', desc: 'Recalled slowly', color: 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/40 text-orange-400' },
    { value: 3, label: 'Got It', desc: 'Slow, hesitant', color: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40 text-yellow-400' },
    { value: 4, label: 'Good', desc: 'Smooth execution', color: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/40 text-green-400' },
    { value: 5, label: 'Perfect', desc: 'Immediate execution', color: 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500' },
  ];

  const currentPreferred = progress?.preferredAlg || alg.recommended;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 backdrop-blur-sm select-none">
      <div className="bg-[#0c0c0e] border border-slate-800 rounded-3xl p-6 max-w-lg w-full relative flex flex-col justify-between min-h-[520px]">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-900">
          <div>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold rounded">
              Active Recall
            </span>
            <span className="text-xs text-slate-500 ml-3">
              Card {currentIndex + 1} of {dueCases.length}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800/30 transition-all"
            id="close-active-review-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          
          {/* Visual representation */}
          <div className="mb-4">
            <CubeVisualizer caseId={alg.id} subset={alg.subset} puzzle={alg.puzzle} size={110} />
          </div>

          <h2 className="text-2xl font-bold text-white">{alg.name}</h2>
          <p className="text-xs text-slate-500 mt-1">{alg.subset} subset • {alg.puzzle}</p>

          {/* Reveal area */}
          {!isRevealed ? (
            <div className="mt-6 w-full">
              <button
                onClick={() => setIsRevealed(true)}
                className="mx-auto flex items-center gap-2 px-6 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl font-bold text-sm border border-indigo-500/20 transition-all"
                id="reveal-alg-btn"
              >
                <Eye className="w-4 h-4" />
                Reveal Algorithm
              </button>
            </div>
          ) : (
            <div className="mt-4 w-full text-left space-y-4 animate-fade-in">
              <div className="bg-[#09090b] p-4 rounded-xl border border-indigo-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase">Your Execution Path</span>
                  <a
                    href={getSpeedCubeDBUrl(alg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>SpeedCubeDB</span>
                  </a>
                </div>
                <p className="font-mono text-lg text-white tracking-wider break-all select-all">
                  {currentPreferred}
                </p>
              </div>

              {alg.recognition && (
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Recognition Clue</span>
                  <p className="text-xs text-slate-300">{alg.recognition}</p>
                </div>
              )}

              {progress?.notes && (
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Your Notes</span>
                  <p className="text-xs text-slate-300">{progress.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Rating Controls */}
        <div className="pt-4 border-t border-slate-900">
          {!isRevealed ? (
            <p className="text-xs text-center text-slate-500 italic">
              Solve the case on your physical cube, then tap reveal to score your recall accuracy.
            </p>
          ) : (
            <div>
              <p className="text-xs text-center text-slate-400 mb-3 font-medium">How well did you execute this?</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ratings.map((rating) => (
                  <button
                    key={rating.value}
                    onClick={() => handleRatingSubmit(rating.value)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 border rounded-xl transition-all duration-200 cursor-pointer ${rating.color}`}
                    title={rating.desc}
                    id={`rating-${rating.value}-btn`}
                  >
                    <span className="text-base font-bold">{rating.value}</span>
                    <span className="text-[9px] font-semibold tracking-tight">{rating.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
