import React from 'react';

export function AreaChartSkeleton() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-2 select-none animate-pulse">
      {/* Simulation Grid System */}
      <div className="flex-1 flex flex-col justify-between py-2 relative">
        {/* Horizontal grid lines */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full border-t border-zinc-150/50 dark:border-zinc-800/20 h-0" />
        ))}
        
        {/* SVG Area Path Simulation */}
        <svg className="absolute inset-x-0 bottom-0 h-40 w-full text-zinc-100 dark:text-zinc-900/40" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="skeletonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Wave line */}
          <path
            d="M 0,60 Q 20,30 40,70 T 80,20 T 100,45"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="opacity-40"
          />
          {/* Wave filled gradient area */}
          <path
            d="M 0,60 Q 20,30 40,70 T 80,20 T 100,45 L 100,100 L 0,100 Z"
            fill="url(#skeletonGrad)"
            className="opacity-70"
          />
        </svg>

        {/* Floating pulse point */}
        <div className="absolute left-[40%] top-[40%] w-2 h-2 rounded-full bg-indigo-500/30 dark:bg-purple-500/20 ring-4 ring-indigo-500/10 dark:ring-purple-500/10" />
        <div className="absolute left-[80%] top-[15%] w-2 h-2 rounded-full bg-indigo-500/30 dark:bg-purple-500/20 ring-4 ring-indigo-500/10 dark:ring-purple-500/10" />
      </div>

      {/* Axis lines simulation */}
      <div className="h-6 flex items-center justify-between border-t border-zinc-150/55 dark:border-zinc-800/30 pt-1">
        <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export function PieChartSkeleton() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 select-none animate-pulse">
      <div className="relative w-44 h-44 flex items-center justify-center">
        {/* Outer Circular Ring and Inner Circle representing Donut Chart */}
        <svg className="w-full h-full text-zinc-150 dark:text-zinc-800/40" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeDasharray="45 5 25 5 15 5"
            className="opacity-60"
          />
        </svg>

        {/* Center core */}
        <div className="absolute w-24 h-24 rounded-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850/60 shadow-xs flex flex-col items-center justify-center gap-1">
          <div className="h-2.5 w-12 bg-zinc-200 dark:bg-zinc-850 rounded" />
          <div className="h-2 w-8 bg-zinc-150 dark:bg-zinc-900 rounded" />
        </div>
      </div>

      {/* Pie Chart Legend simulation */}
      <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-[280px]">
        {[1, 2, 3].map((id) => (
          <div key={id} className="flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-2 w-10 bg-zinc-150 dark:bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChartSkeleton() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-2 select-none animate-pulse">
      {/* Simulation Grid System */}
      <div className="flex-1 flex flex-col justify-between py-2 relative">
        {/* Horizontal grid lines */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full border-t border-zinc-150/50 dark:border-zinc-800/20 h-0" />
        ))}

        {/* Bar alignment row */}
        <div className="absolute inset-x-0 bottom-0 h-44 flex items-end justify-around px-2">
          {[60, 40, 85, 30, 75, 45, 90, 55, 70, 35].map((height, idx) => (
            <div
              key={idx}
              style={{ height: `${height}%` }}
              className="w-4 select-none rounded-t-md bg-zinc-200 dark:bg-zinc-800/60 hover:opacity-100 transition-opacity"
            />
          ))}
        </div>
      </div>

      {/* Axis labels */}
      <div className="h-6 flex items-center justify-between border-t border-zinc-150/55 dark:border-zinc-800/30 pt-1">
        <div className="h-2 w-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-2 w-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}
