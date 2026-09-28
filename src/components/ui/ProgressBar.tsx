import React from 'react';

export function ProgressBar({ current, max, colorClass }: { current: number, max: number, colorClass: string }) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner border border-slate-700">
      <div 
        className={`h-full transition-all duration-300 ${colorClass}`} 
        style={{ width: `${percent}%` }} 
      />
    </div>
  );
}
