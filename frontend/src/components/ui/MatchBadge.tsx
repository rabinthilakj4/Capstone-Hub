import React, { useState } from 'react';
import { Sparkles, Info } from 'lucide-react';

interface MatchBadgeProps {
  score: number;
  breakdown?: any;
  label?: string;
}

export const MatchBadge: React.FC<MatchBadgeProps> = ({ score, breakdown, label = 'Match' }) => {
  const [showModal, setShowModal] = useState(false);

  let badgeColor = 'bg-emerald-500 text-white';
  if (score < 70) badgeColor = 'bg-amber-500 text-white';
  if (score < 50) badgeColor = 'bg-slate-500 text-white';

  return (
    <>
      <div
        onClick={() => breakdown && setShowModal(true)}
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm cursor-pointer hover:opacity-90 transition ${badgeColor}`}
        title="Click to view detailed score breakdown"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{score}% {label}</span>
        {breakdown && <Info className="w-3 h-3 ml-0.5 opacity-80" />}
      </div>

      {showModal && breakdown && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Matching Engine Breakdown</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="text-center py-3 bg-indigo-50 rounded-xl mb-4">
              <span className="text-3xl font-extrabold text-indigo-900">{score}%</span>
              <p className="text-xs text-indigo-600 font-medium">Overall Compatibility Index</p>
            </div>

            <div className="space-y-3 text-sm">
              {Object.entries(breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
                  <span className="font-medium text-slate-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="font-bold text-slate-900">+{String(val)}%</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </>
  );
};
