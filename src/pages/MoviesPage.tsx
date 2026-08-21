import React, { useState, useMemo } from 'react';
import { 
  Film, 
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
  ShieldAlert, 
  Palette,
  Heart,
  HelpCircle
} from 'lucide-react';
import { Movie } from '../types';
import { MediaCard } from '../components/MediaCard';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { GenreFilter } from '../components/GenreFilter';

interface MoviesPageProps {
  movies: Movie[];
  watchlistIds: Set<string>;
  isLoading?: boolean;
  onPlay: (media: Movie) => void;
  onToggleWatchlist: (media: Movie) => void;
  onMoreInfo: (media: Movie) => void;
}

interface GenreCategory {
  name: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const PRIMARY_GENRES: GenreCategory[] = [
  { name: 'All', label: 'All Cinema', icon: Film, description: 'Explore our complete library of verified full-length cinema masterworks.' },
  { name: 'Classic', label: 'Classic Cinema', icon: Film, description: 'Golden age Hollywood, iconic public domain gems, and timeless vintage treasures.' },
  { name: 'Horror', label: 'Horror & Suspense', icon: Ghost, description: 'Classic gothic horrors, psychological ghost tales, zombie survival, and chilling dread.' },
  { name: 'Mystery', label: 'Mystery & Whodunit', icon: Search, description: 'Intriguing puzzles, stolen fortunes, and detective investigations.' },
  { name: 'Comedy', label: 'Comedy & Satire', icon: Smile, description: 'Screwball comedies, slapstick masterworks, witty satires, and timeless laugh-out-loud cinema.' },
  { name: 'Sci-Fi', label: 'Sci-Fi & Cyberpunk', icon: Rocket, description: 'Futuristic dystopias, interstellar space expeditions, artificial intelligence, and alien contact.' },
  { name: 'Action', label: 'Action & Adventure', icon: Zap, description: 'High-octane pursuits, swashbuckling sagas, daring escapes, and explosive showdowns.' },
  { name: 'Drama', label: 'Drama & Romance', icon: Drama, description: 'Deeply emotional narratives, sweeping romances, and poignant human journeys.' },
  { name: 'Documentary', label: 'Documentary & Real Stories', icon: Video, description: 'True investigative histories, internet freedom movements, wartime chronicles, and human portraits.' },
  { name: 'Animation', label: 'Animation & Family', icon: Palette, description: 'Full-length hand-drawn triumphs, vibrant fairy tales, and open-source 3D animated masterworks.' }
];

export const MoviesPage: React.FC<MoviesPageProps> = ({
  movies,
  watchlistIds,
  isLoading = false,
  onPlay,
  onToggleWatchlist,
  onMoreInfo
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'year' | 'title' | 'duration'>('rating');

  // Count items per genre
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = { All: movies.length };
    PRIMARY_GENRES.forEach(g => {
      if (g.name === 'All') return;
      const count = movies.filter(m => {
        const gList = m.genres || ((m as any).genre ? [(m as any).genre] : []);
        return gList.some(item => item.toLowerCase().includes(g.name.toLowerCase()));
      }).length;
      counts[g.name] = count;
    });
    return counts;
  }, [movies]);

  // Filtered & Sorted movies
  const filteredMovies = useMemo(() => {
    let list = movies.filter(m => {
      // 1. Genre filter
      if (selectedGenre !== 'All') {
        const gList = m.genres || ((m as any).genre ? [(m as any).genre] : []);
        const matchesGenre = gList.some(item => item.toLowerCase().includes(selectedGenre.toLowerCase()));
        if (!matchesGenre) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = m.title.toLowerCase().includes(q);
        const descMatch = (m.synopsis || m.description || '').toLowerCase().includes(q);
        const castMatch = m.cast?.some(c => c.toLowerCase().includes(q));
        const directorMatch = m.director?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !castMatch && !directorMatch) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'rating') {
        const rA = typeof a.rating === 'number' ? a.rating : 8.5;
        const rB = typeof b.rating === 'number' ? b.rating : 8.5;
        return rB - rA;
      }
      if (sortBy === 'year') {
        return b.year - a.year;
      }
      if (sortBy === 'duration') {
        return (b.runtime || 90) - (a.runtime || 90);
      }
      return a.title.localeCompare(b.title);
    });

    return list;
  }, [movies, selectedGenre, searchQuery, sortBy]);

  const activeCategory = PRIMARY_GENRES.find(g => g.name === selectedGenre) || PRIMARY_GENRES[0];
  const CategoryIcon = activeCategory.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#E50914] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>NovaStream Cinema Archive</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif-display font-black text-white flex items-center gap-3">
            <Film className="w-8 h-8 sm:w-10 sm:h-10 text-[#E50914]" />
            Feature Films & Masterworks
          </h1>
          <p className="text-sm sm:text-base text-[#A1A1AA] mt-2 max-w-2xl">
            Stream verified, full-length feature films with redundant high-speed mirrors and zero subscription locks.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              key="movies-search-input"
              id="movies-search-input"
              name="moviesSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, actor, director..."
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
              <option value="rating" className="bg-[#181818] text-white">Top Rated</option>
              <option value="year" className="bg-[#181818] text-white">Release Year</option>
              <option value="duration" className="bg-[#181818] text-white">Longest Runtime</option>
              <option value="title" className="bg-[#181818] text-white">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Genre-Specific Filtering Navigation Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Browse by Category</span>
          </h2>
          <span className="text-xs text-[#666666] font-mono">
            {filteredMovies.length} {filteredMovies.length === 1 ? 'film' : 'films'} available
          </span>
        </div>

        {/* Primary Genre Navigation Pills */}
        <GenreFilter
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
          availableGenres={PRIMARY_GENRES.map(g => g.name)}
          counts={genreCounts}
        />
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
                {filteredMovies.length} Titles
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
            Show All Genres
          </button>
        )}
      </div>

      {/* Movies Grid / Skeleton Loader */}
      {isLoading && movies.length === 0 ? (
        <MediaGridSkeleton count={18} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredMovies.map(movie => (
            <MediaCard
              key={movie.id}
              media={movie}
              inWatchlist={watchlistIds.has(movie.id)}
              onPlay={onPlay}
              onToggleWatchlist={onToggleWatchlist}
              onMoreInfo={onMoreInfo}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMovies.length === 0 && (
        <div className="text-center py-16 space-y-4 bg-[#181818] border border-[#262626] rounded-2xl p-8 max-w-lg mx-auto">
          <Film className="w-12 h-12 text-[#A1A1AA] mx-auto opacity-30" />
          <h3 className="text-lg font-bold text-white">No Movies Found</h3>
          <p className="text-xs text-[#A1A1AA]">
            {searchQuery 
              ? `No movies matched your search "${searchQuery}". Try searching for another title or actor.`
              : `No movies currently listed under the ${selectedGenre} category.`}
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
              Reset to All Movies
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
