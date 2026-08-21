import React, { useState, useMemo } from 'react';
import { 
  Tv, 
  SlidersHorizontal, 
  Search, 
  X, 
  Sparkles, 
  Zap, 
  Rocket, 
  Video, 
  Smile, 
  Ghost, 
  Drama, 
  Palette,
  Layers
} from 'lucide-react';
import { Series } from '../types';
import { MediaCard } from '../components/MediaCard';
import { MediaGridSkeleton } from '../components/SkeletonLoader';

interface SeriesPageProps {
  series: Series[];
  watchlistIds: Set<string>;
  isLoading?: boolean;
  onPlay: (media: Series) => void;
  onToggleWatchlist: (media: Series) => void;
  onMoreInfo: (media: Series) => void;
}

interface GenreCategory {
  name: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const PRIMARY_SERIES_GENRES: GenreCategory[] = [
  { name: 'All', label: 'All TV Series', icon: Tv, description: 'Binge-watch complete multi-episode public domain and creative commons series.' },
  { name: 'Action', label: 'Action & Adventure', icon: Zap, description: 'Frontier battles, western showdowns, and high-stakes serial adventures.' },
  { name: 'Sci-Fi', label: 'Sci-Fi & Space Serials', icon: Rocket, description: 'Retro space explorers, interplanetary conflicts, and supernatural mysteries.' },
  { name: 'Documentary', label: 'Documentary & True Chronicles', icon: Video, description: 'Historical anthologies, wartime eyewitness accounts, and verified true events.' },
  { name: 'Comedy', label: 'Comedy & Sitcom Classics', icon: Smile, description: 'Beloved classic television comedies, slapstick sketches, and family humor.' },
  { name: 'Drama', label: 'Drama & Suspense', icon: Drama, description: 'Character-driven episodic sagas, courtroom dilemmas, and family dynasties.' },
  { name: 'Horror', label: 'Horror & Paranormal', icon: Ghost, description: 'Supernatural anthologies, eerie ghost sightings, and unexplained phenomena.' },
  { name: 'Animation', label: 'Animation Serials', icon: Palette, description: 'Classic episodic cartoons, retro animated shorts, and adventures.' }
];

export const SeriesPage: React.FC<SeriesPageProps> = ({
  series,
  watchlistIds,
  isLoading = false,
  onPlay,
  onToggleWatchlist,
  onMoreInfo
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'episodes'>('title');

  // Calculate genre counts
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = { All: series.length };
    PRIMARY_SERIES_GENRES.forEach(g => {
      if (g.name === 'All') return;
      const count = series.filter(s => {
        const gList = s.genres || ((s as any).genre ? [(s as any).genre] : []);
        return gList.some(item => item.toLowerCase().includes(g.name.toLowerCase()));
      }).length;
      counts[g.name] = count;
    });
    return counts;
  }, [series]);

  // Filter and sort series
  const filteredSeries = useMemo(() => {
    let list = series.filter(s => {
      // 1. Genre filter
      if (selectedGenre !== 'All') {
        const gList = s.genres || ((s as any).genre ? [(s as any).genre] : []);
        const matchesGenre = gList.some(item => item.toLowerCase().includes(selectedGenre.toLowerCase()));
        if (!matchesGenre) return false;
      }

      // 2. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = s.title.toLowerCase().includes(q);
        const descMatch = (s.description || '').toLowerCase().includes(q);
        const castMatch = s.cast?.some(c => c.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !castMatch) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'year') {
        return (b.year || 1960) - (a.year || 1960);
      }
      if (sortBy === 'episodes') {
        const countA = a.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
        const countB = b.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
        return countB - countA;
      }
      return a.title.localeCompare(b.title);
    });

    return list;
  }, [series, selectedGenre, searchQuery, sortBy]);

  const activeCategory = PRIMARY_SERIES_GENRES.find(g => g.name === selectedGenre) || PRIMARY_SERIES_GENRES[0];
  const CategoryIcon = activeCategory.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#E50914] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>NovaStream Television Vault</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-black text-white flex items-center gap-3">
            <Tv className="w-8 h-8 sm:w-10 sm:h-10 text-[#E50914]" />
            TV Shows & Episodic Series
          </h1>
          <p className="text-sm sm:text-base text-[#A1A1AA] mt-2 max-w-2xl">
            Complete multi-season serialized cinema with interactive season & episode switchers.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              key="series-search-input"
              id="series-search-input"
              name="seriesSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search series or cast..."
              autoComplete="off"
              className="w-full bg-[#181818] text-white text-xs pl-9 pr-8 py-2.5 rounded-xl border border-[#333333] focus:border-[#E50914] focus:outline-none placeholder-[#666666] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 bg-[#181818] border border-[#333333] rounded-xl px-3 py-2 text-xs text-[#A1A1AA]">
            <SlidersHorizontal className="w-4 h-4 text-[#E50914]" />
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="title" className="bg-[#181818] text-white">Alphabetical (A-Z)</option>
              <option value="year" className="bg-[#181818] text-white">Release Year</option>
              <option value="episodes" className="bg-[#181818] text-white">Episode Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Genre-Specific Filtering Navigation Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Browse Series by Category</span>
          </h2>
          <span className="text-xs text-[#666666] font-mono">
            {filteredSeries.length} {filteredSeries.length === 1 ? 'series' : 'series'} available
          </span>
        </div>

        {/* Primary Genre Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
          {PRIMARY_SERIES_GENRES.map(genre => {
            const isSelected = selectedGenre === genre.name;
            const Icon = genre.icon;
            const count = genreCounts[genre.name] || 0;

            return (
              <button
                key={genre.name}
                id={`series-genre-btn-${genre.name.toLowerCase()}`}
                onClick={() => setSelectedGenre(genre.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#E50914] text-white border-[#E50914] shadow-lg shadow-[#E50914]/25 scale-105'
                    : 'bg-[#181818] text-[#D1D1D6] hover:text-white hover:bg-[#262626] border-[#333333]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#E50914]'}`} />
                <span>{genre.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-[#262626] text-[#A1A1AA]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Genre Spotlight Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1c1c1c] via-[#181818] to-[#141414] border border-[#262626] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shrink-0">
            <CategoryIcon className="w-6 h-6 text-[#E50914]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {activeCategory.label}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914] text-[10px] font-bold">
                {filteredSeries.length} Series
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 max-w-2xl">
              {activeCategory.description}
            </p>
          </div>
        </div>

        {selectedGenre !== 'All' && (
          <button
            onClick={() => setSelectedGenre('All')}
            className="px-3.5 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-[#D1D1D6] hover:text-white transition-colors cursor-pointer shrink-0 border border-[#333333]"
          >
            Show All Shows
          </button>
        )}
      </div>

      {/* Series Grid / Skeleton Loader */}
      {isLoading && series.length === 0 ? (
        <MediaGridSkeleton count={12} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredSeries.map(show => (
            <MediaCard
              key={show.id}
              media={show}
              inWatchlist={watchlistIds.has(show.id)}
              onPlay={onPlay}
              onToggleWatchlist={onToggleWatchlist}
              onMoreInfo={onMoreInfo}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSeries.length === 0 && (
        <div className="text-center py-16 space-y-4 bg-[#181818] border border-[#262626] rounded-2xl p-8 max-w-lg mx-auto">
          <Tv className="w-12 h-12 text-[#A1A1AA] mx-auto opacity-30" />
          <h3 className="text-lg font-bold text-white">No Series Found</h3>
          <p className="text-xs text-[#A1A1AA]">
            {searchQuery 
              ? `No shows matched your search "${searchQuery}".`
              : `No episodic series currently listed under the ${selectedGenre} category.`}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-[#262626] hover:bg-[#333333] text-white text-xs font-bold cursor-pointer"
              >
                Clear Search
              </button>
            )}
            <button
              onClick={() => { setSelectedGenre('All'); setSearchQuery(''); }}
              className="px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer shadow-lg shadow-[#E50914]/20"
            >
              Reset to All Shows
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
