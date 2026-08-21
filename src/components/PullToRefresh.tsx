import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown, Sparkles, CheckCircle2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  isRefreshing?: boolean;
  pullThreshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  isRefreshing: externalIsRefreshing = false,
  pullThreshold = 75,
  maxPullDistance = 120,
  disabled = false
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [internalIsRefreshing, setInternalIsRefreshing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRefreshing = externalIsRefreshing || internalIsRefreshing;

  // Find scrollable parent to determine if we are at top
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return true;
    let parent = containerRef.current.parentElement;
    while (parent) {
      if (parent.scrollTop > 5) return false;
      parent = parent.parentElement;
    }
    return window.scrollY <= 5;
  }, []);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || isRefreshing) return;
    if (isAtTop()) {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startYRef.current = clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPullingRef.current || startYRef.current === null || disabled || isRefreshing) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diff = clientY - startYRef.current;

    if (diff > 0 && isAtTop()) {
      // Apply logarithmic dampening so pull feels natural
      const dampedDistance = Math.min(diff * 0.45, maxPullDistance);
      setPullDistance(dampedDistance);
      if (e.cancelable && diff > 10) {
        // Prevent default browser rubber-banding if we are pulling down
        // e.preventDefault();
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || disabled || isRefreshing) {
      setPullDistance(0);
      isPullingRef.current = false;
      return;
    }

    isPullingRef.current = false;

    if (pullDistance >= pullThreshold) {
      setInternalIsRefreshing(true);
      setPullDistance(pullThreshold); // keep open while refreshing

      try {
        await onRefresh();
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 1200);
      } catch (err) {
        console.warn('Pull-to-refresh failed:', err);
      } finally {
        setTimeout(() => {
          setInternalIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
    startYRef.current = null;
  };

  const progressRatio = Math.min(pullDistance / pullThreshold, 1);
  const rotationDeg = progressRatio * 180;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Pull-To-Refresh Visual Drawer Indicator */}
      <div
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? 1 : 0
        }}
        className="w-full overflow-hidden transition-[height] duration-150 ease-out flex items-center justify-center bg-gradient-to-b from-[#1c1418] via-[#141414] to-[#141414] border-b border-zinc-800/80 select-none z-30"
      >
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-700/80 shadow-lg text-xs font-bold text-zinc-200">
          {justCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-semibold">Streams Refreshed!</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 text-[#E50914] animate-spin shrink-0" />
              <span className="text-zinc-200">Updating YouTube & Internet Archive Catalogues...</span>
            </>
          ) : pullDistance >= pullThreshold ? (
            <>
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse shrink-0" />
              <span className="text-white">Release to refresh NovaStream</span>
            </>
          ) : (
            <>
              <ArrowDown
                style={{ transform: `rotate(${rotationDeg}deg)` }}
                className="w-4 h-4 text-[#E50914] transition-transform duration-100 shrink-0"
              />
              <span className="text-zinc-300">Pull down to refresh catalogue</span>
            </>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance * 0.15, 15)}px)` : 'none',
          transition: isPullingRef.current ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};
