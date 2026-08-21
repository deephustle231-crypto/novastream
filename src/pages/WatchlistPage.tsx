import React, { useState, useMemo } from 'react';
import { Bookmark, Film, Tv, Play, Trash2, SlidersHorizontal, Search, ArrowUpDown, X, CheckCircle2, AlertTriangle, Share2 } from 'lucide-react';
import { WatchlistItem, Movie, Series } from '../types';
import { shareMedia } from '../utils/share';
import { useToast } from '../context/ToastContext';
import { MediaGridSkeleton } from '../components/SkeletonLoader';

interface WatchlistPageProps {
  watchlist: WatchlistItem[];
  movies: Movie[];
  series: Series[];
  isLoading?: boolean;
  onPlay: (media: Movie | Series) => void;
  onRemove: (mediaId: string) => void;
  onMoreInfo: (media: Movie | Series) => void;
  onExplore: () => void;
}

type FilterType = 'all' | 'movie' | 'series';
type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'year-desc' | 'rating-desc';

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  watchlist,
  movies,
  series,
  isLoading = false,
  onPlay,
  onRemove,
  onMoreInfo,
  onExplore
}) => {
  const { showToast } = useToast();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [itemPendingRemoval, setItemPendingRemoval] = useState<WatchlistItem | null>(null);

  const processedWatchlist = useMemo(() => {
    let list = [...watchlist];

    // 1. Filter by media type
    if (filterType !== 'all') {
      list = list.filter(item => item.mediaType === filterType);
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.title.toLowerCase().includes(q)
      );
    }

    // 3. Sort by chosen criteria
    list.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'date-asc':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'year-desc':
          return b.year - a.year;
        case 'rating-desc': {
          const rA = parseFloat(a.rating) || 0;
          const rB = parseFloat(b.rating) || 0;
          return rB - rA;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [watchlist, filterType, searchQuery, sortBy]);

  const handleConfirmRemoval = () => {
    if (itemPendingRemoval) {
      onRemove(itemPendingRemoval.mediaId);
      showToast(`Removed "${itemPendingRemoval.title}" from Watchlist`, 'info');
      setItemPendingRemoval(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-6 text-white">
      {/* Header */}
      <div className="border-b border-[#262626] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-display font-black text-white flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-[#E50914]" />
            My Watchlist
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1 font-medium">
            {watchlist.length} saved masterwork{watchlist.length !== 1 ? 's' : ''} cached locally for instant streaming.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Offline Ready
          </span>
        </div>
      </div>

      {/* Sorting & Filter Controls Toolbar */}
      {watchlist.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
          {/* Left: Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#E50914]" />
              Filter:
            </span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              All ({watchlist.length})
            </button>
            <button
              onClick={() => setFilterType('movie')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'movie'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              <Film className="w-3 h-3" />
              Movies ({watchlist.filter(i => i.mediaType === 'movie').length})
            </button>
            <button
              onClick={() => setFilterType('series')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'series'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              <Tv className="w-3 h-3" />
              Series ({watchlist.filter(i => i.mediaType === 'series').length})
            </button>
          </div>

          {/* Right: Search & Sorting Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search within watchlist */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
              <input
                key="watchlist-search-input"
                id="watchlist-search-input"
                name="watchlistSearch"
                type="text"
                placeholder="Search saved titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#1f1f1f] border border-[#333333] text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#E50914]" />
                Sort:
              </span>
              <select
                id="watchlist-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#1f1f1f] border border-[#333333] text-white text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#E50914] cursor-pointer"
              >
                <option value="date-desc" className="bg-[#141414]">Date Added (Newest First)</option>
                <option value="date-asc" className="bg-[#141414]">Date Added (Oldest First)</option>
                <option value="rating-desc" className="bg-[#141414]">Rating (Highest First)</option>
                <option value="title-asc" className="bg-[#141414]">Title (A → Z)</option>
                <option value="year-desc" className="bg-[#141414]">Release Year (Newest)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading && watchlist.length === 0 ? (
        <MediaGridSkeleton count={10} />
      ) : watchlist.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-[#262626] rounded-3xl p-8 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#1f1f1f] border border-[#333333] flex items-center justify-center mx-auto text-[#A1A1AA]">
            <Bookmark className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif-display font-bold text-white">Your Watchlist is empty</h2>
          <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto">
            Save movies and TV shows to your personal list to easily access them anytime.
          </p>
          <button
            onClick={onExplore}
            className="px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-sm font-semibold shadow-md shadow-[#E50914]/20 transition-all cursor-pointer"
          >
            Explore Cinema Catalog
          </button>
        </div>
      ) : processedWatchlist.length === 0 ? (
        <div className="text-center py-16 bg-[#141414] border border-[#262626] rounded-3xl p-8 space-y-3 shadow-xs">
          <p className="text-sm font-medium text-[#A1A1AA]">
            No saved titles match "{searchQuery}" under the current filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="px-4 py-1.5 rounded-xl bg-[#E50914] text-white text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {processedWatchlist.map(item => {
            const matchedMedia =
              item.mediaType === 'movie'
                ? movies.find(m => m.id === item.mediaId)
                : series.find(s => s.id === item.mediaId);

            return (
              <div
                key={item.id}
                id={`watchlist-card-${item.mediaId}`}
                className="group relative rounded-2xl overflow-hidden bg-[#141414] border border-[#262626] shadow-sm hover:border-[#E50914]/60 hover:shadow-md transition-all flex flex-col cursor-pointer"
                onClick={() => {
                  if (matchedMedia) onMoreInfo(matchedMedia);
                }}
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1f1f1f]">
                  <img
                    src={item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-[#000000]/80 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1 border border-[#333333]">
                      {item.mediaType === 'movie' ? <Film className="w-3 h-3 text-[#E50914]" /> : <Tv className="w-3 h-3 text-[#E50914]" />}
                      {item.mediaType === 'movie' ? 'Movie' : 'Series'}
                    </span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                    {matchedMedia && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(matchedMedia);
                        }}
                        className="w-10 h-10 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        title="Play Title"
                      >
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </button>
                    )}

                    {matchedMedia && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareMedia(matchedMedia, showToast);
                        }}
                        className="w-9 h-9 rounded-full bg-[#1f1f1f] border border-[#333333] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        title="Share Title"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemPendingRemoval(item);
                      }}
                      className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#E50914] text-white border border-[#333333] flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <h3 className="font-bold text-sm text-white truncate group-hover:text-[#E50914] transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                    <span>{item.year}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{item.rating || 'Verified'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR WATCHLIST REMOVAL */}
      {itemPendingRemoval && (
        <div
          id="watchlist-removal-modal-backdrop"
          onClick={() => setItemPendingRemoval(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 text-white"
        >
          <div
            id="watchlist-removal-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header with Icon */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E50914]/10 border border-[#E50914]/30 flex items-center justify-center shrink-0 text-[#E50914]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-serif-display font-bold text-white">
                  Remove from Watchlist?
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Are you sure you want to remove <strong className="text-white">"{itemPendingRemoval.title}"</strong> from your saved collection?
                </p>
              </div>
            </div>

            {/* Title Preview Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1f1f1f] border border-[#262626]">
              <img
                src={itemPendingRemoval.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop'}
                alt={itemPendingRemoval.title}
                className="w-12 h-16 object-cover rounded-lg shrink-0 border border-[#333333]"
              />
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white truncate">{itemPendingRemoval.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#A1A1AA]">
                  <span>{itemPendingRemoval.year}</span>
                  <span>•</span>
                  <span className="capitalize">{itemPendingRemoval.mediaType}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="cancel-remove-btn"
                onClick={() => setItemPendingRemoval(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#333333]"
              >
                Cancel
              </button>

              <button
                id="confirm-remove-btn"
                onClick={handleConfirmRemoval}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all shadow-md shadow-[#E50914]/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove from Watchlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
