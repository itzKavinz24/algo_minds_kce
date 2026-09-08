import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#E5E9E6] ${className}`}
    />
  );
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 sm:p-5 rounded-card bg-white border border-[#DDE6E1] space-y-2.5 shadow-2xs">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-5 sm:p-6 rounded-card bg-white border border-[#DDE6E1] space-y-4 shadow-2xs">
      <div className="flex justify-between items-center pb-3 border-b border-[#DDE6E1]">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
      <Skeleton className="h-60 sm:h-72 w-full rounded-md" />
    </div>
  );
}

export function InsightSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-5 sm:p-6 rounded-card bg-white border border-[#DDE6E1] space-y-3 shadow-2xs">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      <div className="p-5 sm:p-6 rounded-card bg-white border border-[#DDE6E1] space-y-3 shadow-2xs">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
