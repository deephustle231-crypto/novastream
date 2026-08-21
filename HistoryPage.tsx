import React, { useState, useMemo } from 'react';
import {
  History,
  Play,
  Trash2,
  Film,
  Tv,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Search,
  Share2,
  AlertTriangle,
  X,
  SlidersHorizontal,
  RotateCcw,
  Check
} from 'lucide-react';
import { WatchProgress, Movie, Series, Episode } from '../types';
import { shareMedia } from '../utils/share';
import { useToast } from '../context/ToastContext';

interface HistoryPageProps {
  watchProgress: WatchProgress[];
  movies: Movie[];
  series: Series[];
  onPlay: (media: Movie | Series, episodeOrPos?: Episode | number) => void;
  onMoreInfo: (media: Movie | Series) => void;
  onRemoveItem: (mediaId: string) => void;
  onClearAll: () => void;
  onExplore: () => void;
}

type SortOption = 'recent-desc' | 'recent-asc' | 'progress-desc' | 'title-asc';
type FilterOption = 'all' | 'movie' | 'episode' | 'in-progress' | 'completed';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  watchProgress,
  movies,
  series,
  onPlay,
  onMoreInfo,
  onRemoveItem,
  onClearAll,
  onExplore
}) => {
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState<SortOption>('recent-desc');
  const [filterType, setFilterType] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemPendingRemoval, setItemPendingRemoval] = useState<WatchProgress | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Helper to format seconds into readable "1h 24m" or "45m 12s"
  const formatTime = (totalSeconds: number): string => {
    if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Helper to format date into readable relative time
  const formatWatchedDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recently';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return 'Recently';
    }
  };

  // Filtered & Sorted history items
  const processedHistory = useMemo(() => {
    let result = [...watchProgress];

    // 1. Filter by category
    if (filterType === 'movie') {
      result = result.filter(item => item.mediaType === 'movie');
    } else if (filterType === 'episode') {
      result = result.filter(item => item.mediaType === 'episode');
    } else if (filterType === 'in-progress') {
      result = result.filter(item => !item.completed && item.completionPercentage < 90);
    } else if (filterType === 'completed') {
      result = result.filter(item => item.completed || item.completionPercentage >= 90);
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => item.title.toLowerCase().includes(q));
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent-asc':
          return new Date(a.lastWatchedAt || 0).getTime() - new Date(b.lastWatchedAt || 0).getTime();
        case 'progress-desc':
          return (b.completionPercentage || 0) - (a.completionPercentage || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'recent-desc':
        default:
          return new Date(b.lastWatchedAt || 0).getTime() - new Date(a.lastWatchedAt || 0).getTime();
      }
    });

    return result;
  }, [watchProgress, filterType, searchQuery, sortBy]);

  // Find underlying Movie / Series entity
  const resolveMedia = (item: WatchProgress): {
    movie?: Movie;
    series?: Series;
    episode?: Episode;
  } => {
    if (item.mediaType === 'movie') {
      const movie = movies.find(m => m.id === item.mediaId);
      return { movie };
    } else {
      const matchedSeries = series.find(s => s.id === item.seriesId || s.id === item.mediaId);
      let foundEpisode: Episode | undefined;

      if (matchedSeries && matchedSeries.seasons) {
        for (const season of matchedSeries.seasons) {
          const ep = season.episodes?.find(e => e.id === item.episodeId || e.id === item.mediaId);
          if (ep) {
            foundEpisode = ep;
            break;
          }
        }
      }

      return { series: matchedSeries, episode: foundEpisode };
    }
  };

  const handlePlayItem = (item: WatchProgress) => {
    const { movie, series: resolvedSeries, episode } = resolveMedia(item);

    if (movie) {
      const resumePos = item.completed || item.completionPercentage >= 95 ? 0 : item.positionSeconds;
      onPlay(movie, resumePos);
    } else if (resolvedSeries) {
      if (episode) {
        onPlay(resolvedSeries, episode);
      } else {
        onPlay(resolvedSeries);
      }
    }
  };

  const handleConfirmRemoval = () => {
    if (itemPendingRemoval) {
      onRemoveItem(itemPendingRemoval.mediaId);
      showToast(`Removed "${itemPendingRemoval.title}" from Watch History`, 'info');
      setItemPendingRemoval(null);
    }
  };

  const handleConfirmClearAll = () => {
    onClearAll();
    showToast('Watch history cleared successfully', 'info');
    setShowClearConfirm(false);
  };

  return (
    <div id="history-page-root" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-6 text-white">
      {/* Page Header */}
      <div className="border-b border-[#262626] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-display font-black text-white flex items-center gap-3">
            <History className="w-8 h-8 text-[#E50914]" />
            Watch History
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1 font-medium">
            Chronological record of {watchProgress.length} watched title{watchProgress.length !== 1 ? 's' : ''} across your sessions.
          </p>
        </div>

        {watchProgress.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              id="clear-all-history-btn"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-[#E50914] border border-[#333333] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Entire History
            </button>
          </div>
        )}
      </div>

      {/* Sorting & Filter Controls Toolbar */}
      {watchProgress.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
          {/* Left: Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#E50914]" />
              Filter:
            </span>
            <button
              id="history-filter-all"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              All ({watchProgress.length})
            </button>
            <button
              id="history-filter-movies"
              onClick={() => setFilterType('movie')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'movie'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              <Film className="w-3 h-3" />
              Movies ({watchProgress.filter(i => i.mediaType === 'movie').length})
            </button>
            <button
              id="history-filter-series"
              onClick={() => setFilterType('episode')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'episode'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              <Tv className="w-3 h-3" />
              TV Shows ({watchProgress.filter(i => i.mediaType === 'episode').length})
            </button>
            <button
              id="history-filter-in-progress"
              onClick={() => setFilterType('in-progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'in-progress'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              <Clock className="w-3 h-3" />
              In Progress ({watchProgress.filter(i => !i.completed && i.completionPercentage < 90).length})
            </button>
            <button
              id="history-filter-completed"
              onClick={() => setFilterType('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'completed'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] border border-[#333333]'
              }`}
            >
              <Check className="w-3 h-3" />
              Completed ({watchProgress.filter(i => i.completed || i.completionPercentage >= 90).length})
            </button>
          </div>

          {/* Right: Search & Sorting */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
              <input
                key="history-search-input"
                id="history-search-input"
                name="historySearch"
                type="text"
                placeholder="Search watched titles..."
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
                id="history-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#1f1f1f] border border-[#333333] text-white text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#E50914] cursor-pointer"
              >
                <option value="recent-desc" className="bg-[#141414]">Recently Watched (Newest)</option>
                <option value="recent-asc" className="bg-[#141414]">Recently Watched (Oldest)</option>
                <option value="progress-desc" className="bg-[#141414]">Watch Completion (%)</option>
                <option value="title-asc" className="bg-[#141414]">Title (A → Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {watchProgress.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-[#262626] rounded-3xl p-8 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#1f1f1f] border border-[#333333] flex items-center justify-center mx-auto text-[#A1A1AA]">
            <History className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif-display font-bold text-white">No Watch History Yet</h2>
          <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto">
            Movies and series you stream will automatically be logged here with your playback progress.
          </p>
          <button
            id="history-explore-btn"
            onClick={onExplore}
            className="px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-sm font-semibold shadow-md shadow-[#E50914]/20 transition-all cursor-pointer"
          >
            Explore Movies & Shows
          </button>
        </div>
      ) : processedHistory.length === 0 ? (
        <div className="text-center py-16 bg-[#141414] border border-[#262626] rounded-3xl p-8 space-y-3 shadow-xs">
          <p className="text-sm font-medium text-[#A1A1AA]">
            No titles match "{searchQuery}" under the selected history filter.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {processedHistory.map(item => {
            const { movie, series: resolvedSeries, episode } = resolveMedia(item);
            const targetMedia = movie || resolvedSeries;
            const isFinished = item.completed || item.completionPercentage >= 90;
            const progressPercent = Math.min(100, Math.max(0, item.completionPercentage || 0));

            return (
              <div
                key={item.id || item.mediaId}
                id={`history-card-${item.mediaId}`}
                className="group rounded-2xl overflow-hidden bg-[#141414] border border-[#262626] shadow-sm hover:border-[#E50914]/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Media Thumbnail with Overlay and Progress Bar */}
                  <div
                    className="relative aspect-video w-full overflow-hidden bg-[#1f1f1f] cursor-pointer"
                    onClick={() => {
                      if (targetMedia) onMoreInfo(targetMedia);
                    }}
                  >
                    <img
                      src={
                        item.poster ||
                        targetMedia?.backdrop ||
                        targetMedia?.poster ||
                        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Media Type & Status Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md bg-[#000000]/80 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1 border border-[#333333]">
                        {item.mediaType === 'movie' ? (
                          <Film className="w-3 h-3 text-[#E50914]" />
                        ) : (
                          <Tv className="w-3 h-3 text-[#E50914]" />
                        )}
                        {item.mediaType === 'movie' ? 'Movie' : 'TV Episode'}
                      </span>

                      {isFinished && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 text-[10px] font-bold flex items-center gap-1 shadow-xs border border-emerald-700/50">
                          <CheckCircle2 className="w-3 h-3" />
                          Watched
                        </span>
                      )}
                    </div>

                    {/* Last Watched Timestamp Badge */}
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md bg-[#000000]/80 backdrop-blur-xs text-[10px] font-medium text-[#A1A1AA] border border-[#333333]">
                        {formatWatchedDate(item.lastWatchedAt)}
                      </span>
                    </div>

                    {/* Hover Overlay with Quick Actions */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayItem(item);
                        }}
                        className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        title={isFinished ? 'Rewatch from Beginning' : 'Resume Playback'}
                      >
                        {isFinished ? (
                          <RotateCcw className="w-5 h-5 fill-current ml-0.5" />
                        ) : (
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        )}
                      </button>

                      {targetMedia && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareMedia(targetMedia, showToast);
                          }}
                          className="w-9 h-9 rounded-full bg-[#1f1f1f] border border-[#333333] text-white hover:text-[#E50914] flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
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
                        title="Remove from History"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Bar Ribbon */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#000000]/60 z-10">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFinished ? 'bg-emerald-500' : 'bg-[#E50914]'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Title & Metadata Details */}
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        onClick={() => {
                          if (targetMedia) onMoreInfo(targetMedia);
                        }}
                        className="font-bold text-sm text-white line-clamp-1 group-hover:text-[#E50914] transition-colors cursor-pointer"
                      >
                        {item.title}
                      </h3>
                    </div>

                    {/* Series episode subtitle or movie runtime */}
                    <div className="flex items-center justify-between text-xs text-[#A1A1AA] font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#E50914]" />
                        {item.mediaType === 'episode' ? (
                          <span>S{item.seasonNumber || 1}:E{item.episodeNumber || 1} • {formatTime(item.durationSeconds)}</span>
                        ) : (
                          <span>{formatTime(item.durationSeconds)}</span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {Math.round(progressPercent)}% Watched
                      </span>
                    </div>

                    {/* Numerical playback timestamp */}
                    <div className="pt-1.5 border-t border-[#262626] flex items-center justify-between text-[11px] text-[#A1A1AA] font-mono">
                      <span>Position: {formatTime(item.positionSeconds)}</span>
                      <span>Left: {formatTime(Math.max(0, item.durationSeconds - item.positionSeconds))}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="px-3.5 pb-3.5 pt-1 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePlayItem(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1f1f1f] hover:bg-[#E50914] text-white text-xs font-bold transition-all border border-[#333333] cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isFinished ? 'Rewatch' : 'Resume'}</span>
                  </button>

                  <button
                    onClick={() => setItemPendingRemoval(item)}
                    className="p-2 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-[#E50914] border border-[#333333] transition-colors cursor-pointer"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION MODAL FOR SINGLE ITEM REMOVAL */}
      {itemPendingRemoval && (
        <div
          id="history-removal-modal-backdrop"
          onClick={() => setItemPendingRemoval(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 text-white"
        >
          <div
            id="history-removal-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E50914]/10 border border-[#E50914]/30 flex items-center justify-center shrink-0 text-[#E50914]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-serif-display font-bold text-white">
                  Remove from History?
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Are you sure you want to remove <strong className="text-white">"{itemPendingRemoval.title}"</strong> from your watch history? Your saved playback progress will be reset.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setItemPendingRemoval(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#333333]"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmRemoval}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all shadow-md shadow-[#E50914]/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR CLEAR ENTIRE HISTORY */}
      {showClearConfirm && (
        <div
          id="clear-all-history-modal-backdrop"
          onClick={() => setShowClearConfirm(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 text-white"
        >
          <div
            id="clear-all-history-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E50914]/10 border border-[#E50914]/30 flex items-center justify-center shrink-0 text-[#E50914]">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-serif-display font-bold text-white">
                  Clear Entire Watch History?
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  This will remove all {watchProgress.length} recorded movies and TV series episodes from your playback history. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#333333]"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmClearAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all shadow-md shadow-[#E50914]/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
