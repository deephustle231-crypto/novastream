import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, Check, Info } from 'lucide-react';
import { Movie, Series } from '../types';
import { HoverPreviewPoster } from './HoverPreviewPoster';

interface Top10RowProps {
  id?: string;
  title: string;
  items: (Movie | Series)[];
  watchlistIds: Set<string>;
  onPlay: (media: Movie | Series) => void;
  onToggleWatchlist: (media: Movie | Series) => void;
  onMoreInfo: (media: Movie | Series) => void;
}

export const Top10Row: React.FC<Top10RowProps> = ({
  id = 'top-10-row',
  title,
  items,
  watchlistIds,
  onPlay,
  onToggleWatchlist,
  onMoreInfo
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const top10Items = items.slice(0, 10);

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

  if (!top10Items || top10Items.length === 0) return null;

  return (
    <div id={id} className="relative py-4 space-y-2 group">
      {/* Row Header */}
      <div className="flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-[#E50914] transition-colors flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-[#E50914] rounded-full inline-block" />
          {title}
        </h2>
      </div>

      {/* Carousel Container */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-30 w-10 h-24 bg-black/70 hover:bg-[#E50914] text-white rounded-r-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl backdrop-blur-xs cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={rowRef}
          className="flex items-center gap-6 overflow-x-auto scrollbar-none py-4 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {top10Items.map((item, index) => {
            const rank = index + 1;
            const inWatchlist = watchlistIds.has(item.id);
            const isHovered = hoveredCardId === item.id;

            return (
              <div
                key={item.id}
                id={`top10-item-${rank}`}
                onClick={() => onMoreInfo(item)}
                onMouseEnter={() => setHoveredCardId(item.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                className="group/card relative flex-shrink-0 flex items-center cursor-pointer transition-transform duration-300 hover:scale-105"
              >
                {/* Giant Netflix Outline Rank Number (1 to 10) */}
                <div className="relative w-20 sm:w-28 md:w-32 h-44 sm:h-56 md:h-64 flex items-center justify-end pr-1 select-none pointer-events-none z-0">
                  <span
                    className="font-black text-7xl sm:text-8xl md:text-9xl tracking-tighter"
                    style={{
                      WebkitTextStroke: '4px #595959',
                      color: '#141414',
                      fontFamily: 'impact, sans-serif',
                      textShadow: '0 0 20px rgba(0,0,0,0.8)'
                    }}
                  >
                    {rank}
                  </span>
                </div>

                {/* Vertical Poster Card with Dynamic Hover Looping Preview */}
                <div className="relative w-32 sm:w-40 md:w-44 h-44 sm:h-56 md:h-64 rounded-md overflow-hidden bg-[#181818] shadow-2xl border border-zinc-800 group-hover/card:border-[#E50914] z-10">
                  <HoverPreviewPoster
                    media={item}
                    isHovered={isHovered}
                    aspectRatioClass="h-full w-full"
                    showBadges={false}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />

                  {/* Top "TOP 10" Badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#E50914] text-white text-[9px] font-black uppercase tracking-wider shadow-md pointer-events-none z-20">
                    TOP 10
                  </div>

                  {/* Quick Action Overlay on Hover */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(item);
                      }}
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-zinc-200 transition-transform hover:scale-110 cursor-pointer"
                      title="Play Now"
                    >
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(item);
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer backdrop-blur-xs ${
                          inWatchlist
                            ? 'bg-[#E50914] border-[#E50914] text-white'
                            : 'bg-black/60 border-zinc-400 hover:border-white text-white'
                        }`}
                        title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
                      >
                        {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoreInfo(item);
                        }}
                        className="w-7 h-7 rounded-full bg-black/60 border border-zinc-400 hover:border-white text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                        title="More Info"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-30 w-10 h-24 bg-black/70 hover:bg-[#E50914] text-white rounded-l-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl backdrop-blur-xs cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
