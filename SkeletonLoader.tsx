import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Basic Shimmer Pulse Block
 */
export const ShimmerBlock: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden bg-zinc-900/90 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent ${className}`}
    />
  );
};

/**
 * Skeleton Loader for Single Media Card in Horizontal Row
 */
export const MediaCardSkeleton: React.FC = () => {
  return (
    <div className="flex-shrink-0 w-48 sm:w-60 md:w-72 rounded-md overflow-hidden bg-[#181818] border border-zinc-800/80 select-none animate-pulse">
      {/* 16:9 Aspect Poster Area */}
      <div className="relative aspect-[16/9] w-full bg-zinc-900 overflow-hidden">
        <ShimmerBlock className="w-full h-full" />
        {/* Top-left badge placeholder */}
        <div className="absolute top-2 left-2 w-12 h-4 rounded bg-zinc-800" />
        {/* Bottom title placeholder */}
        <div className="absolute bottom-2 left-3 right-8 h-4 rounded bg-zinc-800" />
      </div>

      {/* Card Content & Action Controls */}
      <div className="p-3 bg-[#181818] space-y-2.5">
        {/* Action Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800" />
        </div>

        {/* Match & Year Row */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="w-16 h-3 rounded bg-zinc-800" />
          <div className="w-10 h-3 rounded bg-zinc-800" />
          <div className="w-12 h-3 rounded bg-zinc-800" />
        </div>

        {/* Genre Tags */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="w-14 h-2.5 rounded bg-zinc-800" />
          <div className="w-2 h-2 rounded-full bg-zinc-800" />
          <div className="w-16 h-2.5 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Full-Width Grid Card
 */
export const GridCardSkeleton: React.FC = () => {
  return (
    <div className="w-full rounded-md overflow-hidden bg-[#181818] border border-zinc-800/80 select-none animate-pulse">
      {/* 16:9 Aspect Poster Area */}
      <div className="relative aspect-[16/9] w-full bg-zinc-900 overflow-hidden">
        <ShimmerBlock className="w-full h-full" />
        <div className="absolute top-2 left-2 w-12 h-4 rounded bg-zinc-800" />
        <div className="absolute bottom-2 left-3 right-6 h-4 rounded bg-zinc-800" />
      </div>

      {/* Card Details */}
      <div className="p-3 bg-[#181818] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-zinc-800" />
            <div className="w-7 h-7 rounded-full bg-zinc-800" />
          </div>
          <div className="w-7 h-7 rounded-full bg-zinc-800" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-3 rounded bg-zinc-800" />
          <div className="w-8 h-3 rounded bg-zinc-800" />
          <div className="w-10 h-3 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Entire Horizontal Media Row
 */
export const MediaRowSkeleton: React.FC<{ titleWidth?: string }> = ({ titleWidth = 'w-48' }) => {
  return (
    <div className="relative py-4 space-y-2">
      {/* Row Header */}
      <div className="flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-5 bg-[#E50914] rounded-full" />
          <div className={`h-5 ${titleWidth} rounded bg-zinc-800 animate-pulse`} />
        </div>
      </div>

      {/* Carousel Track */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3.5 overflow-hidden py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Top 10 Ranked Row
 */
export const Top10RowSkeleton: React.FC = () => {
  return (
    <div className="relative py-4 space-y-2">
      {/* Header */}
      <div className="flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 bg-[#E50914] rounded-full" />
          <div className="h-6 w-56 rounded bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Top 10 Track */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 overflow-hidden py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex items-center select-none animate-pulse">
              {/* Number placeholder */}
              <div className="w-16 sm:w-24 h-44 sm:h-56 flex items-center justify-center font-black text-6xl text-zinc-800">
                {i + 1}
              </div>
              {/* Vertical Card placeholder */}
              <div className="w-32 sm:w-40 md:w-44 h-44 sm:h-56 md:h-64 rounded-md bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                <ShimmerBlock className="w-full h-full" />
                <div className="absolute bottom-3 left-3 right-3 h-4 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Responsive Media Grid (Movies / Series Page)
 */
export const MediaGridSkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <GridCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton Loader for Hero Banner
 */
export const HeroBannerSkeleton: React.FC = () => {
  return (
    <div className="relative w-full h-[78vh] min-h-[550px] max-h-[820px] bg-[#141414] overflow-hidden select-none animate-pulse">
      {/* Background with Shimmer */}
      <div className="absolute inset-0 bg-zinc-950">
        <ShimmerBlock className="w-full h-full opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent" />
      </div>

      {/* Hero Content Skeletons */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 sm:pb-20 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Badge Tag */}
          <div className="flex items-center gap-2">
            <div className="w-28 h-5 rounded bg-zinc-800" />
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
            <div className="w-20 h-4 rounded bg-zinc-800" />
          </div>

          {/* Big Title */}
          <div className="w-3/4 sm:w-2/3 h-12 sm:h-16 rounded-lg bg-zinc-800" />

          {/* Synopsis lines */}
          <div className="space-y-2 max-w-xl">
            <div className="w-full h-4 rounded bg-zinc-800" />
            <div className="w-5/6 h-4 rounded bg-zinc-800" />
            <div className="w-2/3 h-4 rounded bg-zinc-800" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <div className="w-28 h-11 rounded-lg bg-zinc-800" />
            <div className="w-32 h-11 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
};
