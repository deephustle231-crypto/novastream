import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, Series } from '../types';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  id: string;
  title: string;
  subtitle?: string;
  items: (Movie | Series)[];
  watchlistIds: Set<string>;
  onPlay: (media: Movie | Series) => void;
  onToggleWatchlist: (media: Movie | Series) => void;
  onMoreInfo: (media: Movie | Series) => void;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  id,
  title,
  subtitle,
  items,
  watchlistIds,
  onPlay,
  onToggleWatchlist,
  onMoreInfo
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div id={id} className="relative py-4 space-y-1.5 group">
      {/* Row Header */}
      <div className="flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-[#E50914] transition-colors flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#E50914] rounded-full inline-block" />
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-0.5 font-medium ml-3.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-30 w-10 h-20 bg-black/70 hover:bg-[#E50914] text-white rounded-r-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl backdrop-blur-xs cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={rowRef}
          className="flex items-center gap-3.5 overflow-x-auto scrollbar-none py-3 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map(item => (
            <MediaCard
              key={item.id}
              media={item}
              inWatchlist={watchlistIds.has(item.id)}
              onPlay={onPlay}
              onToggleWatchlist={onToggleWatchlist}
              onMoreInfo={onMoreInfo}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-30 w-10 h-20 bg-black/70 hover:bg-[#E50914] text-white rounded-l-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl backdrop-blur-xs cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
