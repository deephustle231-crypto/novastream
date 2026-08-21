import React, { useState, useMemo } from 'react';
import { Movie, Series, WatchProgress } from '../types';
import { HeroBanner } from '../components/HeroBanner';
import { MediaRow } from '../components/MediaRow';
import { Top10Row } from '../components/Top10Row';
import { GenreFilter, DEFAULT_GENRES } from '../components/GenreFilter';
import { HeroBannerSkeleton, MediaRowSkeleton, Top10RowSkeleton } from '../components/SkeletonLoader';
import { PullToRefresh } from '../components/PullToRefresh';
import { Play, Sparkles, Film, Tv, Clock, Check, Plus, Info, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  movies: Movie[];
  series: Series[];
  watchProgress: WatchProgress[];
  watchlistIds: Set<string>;
  isLoading?: boolean;
  onRefresh?: () => Promise<void> | void;
  onPlay: (media: Movie | Series, initialPosition?: number) => void;
  onToggleWatchlist: (media: Movie | Series) => void;
  onMoreInfo: (media: Movie | Series) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  movies,
  series,
  watchProgress,
  watchlistIds,
  isLoading = false,
  onRefresh,
  onPlay,
  onToggleWatchlist,
  onMoreInfo
}) => {
  const { isPremium } = useAuth();
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('All');

  // If catalogue is currently loading, render shimmering skeleton structures
  if (isLoading && movies.length === 0) {
    return (
      <div id="netflix-home-page" className="min-h-screen bg-[#141414] text-white pb-20">
        <HeroBannerSkeleton />
        <div className="space-y-6 sm:space-y-8 relative z-10 -mt-8">
          <Top10RowSkeleton />
          <MediaRowSkeleton titleWidth="w-40" />
          <MediaRowSkeleton titleWidth="w-56" />
          <MediaRowSkeleton titleWidth="w-48" />
        </div>
      </div>
    );
  }

  // Featured Media for Hero Banner (select prime showcase title)
  const heroMedia: Movie | Series = useMemo(() => {
    const preferred = movies.find(m => m.id === 'm201') || movies.find(m => m.id === 'm211') || movies.find(m => m.id === 'm218') || movies[0];
    return preferred || {
      id: 'default-hero',
      title: 'Tears of Steel',
      year: 2012,
      duration: '1h 12m',
      quality: '1080p HD',
      genre: 'Sci-Fi / Action',
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
      backdrop: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&q=80',
      synopsis: 'In a dystopian future, a squad of elite warriors and scientists gather at the Oude Kerk in Amsterdam to stage a desperate technological intervention to save humanity.',
      sources: [{ name: 'S1', url: 'https://www.youtube.com/embed/R6MlUcmOul8' }],
      qualities: [{ resolution: '1080p (HD)', url: 'https://www.youtube.com/embed/R6MlUcmOul8' }]
    };
  }, [movies]);

  // Combine media for broad filtering
  const allMedia: (Movie | Series)[] = useMemo(() => {
    return [...movies, ...series];
  }, [movies, series]);

  // Trending media
  const trendingMedia = useMemo(() => {
    return allMedia.slice(0, 10);
  }, [allMedia]);

  // Top 10 Today
  const top10Media = useMemo(() => {
    return movies.slice(0, 10);
  }, [movies]);

  // Bollywood Blockbusters & Cinema
  const bollywoodMedia = useMemo(() => {
    return allMedia.filter(m => {
      const g = (m.genre || (m.genres ? m.genres.join(' ') : '')).toLowerCase();
      return g.includes('bollywood') || m.id.startsWith('m21');
    });
  }, [allMedia]);

  // Hollywood & Sci-Fi Features
  const hollywoodMedia = useMemo(() => {
    return allMedia.filter(m => {
      const g = (m.genre || (m.genres ? m.genres.join(' ') : '')).toLowerCase();
      return !g.includes('bollywood') && (m.id.startsWith('m20') || g.includes('sci-fi') || g.includes('documentary'));
    });
  }, [allMedia]);

  // Continue Watching items with progress
  const continueWatchingMedia = useMemo(() => {
    if (!watchProgress || watchProgress.length === 0) return [];
    return watchProgress
      .map(wp => {
        const item = allMedia.find(m => m.id === wp.mediaId);
        if (!item) return null;
        return { item, progress: wp };
      })
      .filter((entry): entry is { item: Movie | Series; progress: WatchProgress } => entry !== null);
  }, [watchProgress, allMedia]);

  // Sci-Fi & Action
  const sciFiActionMedia = useMemo(() => {
    return allMedia.filter(m => {
      const g = (m.genre || (m.genres ? m.genres.join(' ') : '')).toLowerCase();
      return g.includes('sci-fi') || g.includes('action') || g.includes('cyberpunk');
    });
  }, [allMedia]);

  // Noir & Mysteries
  const noirMysteryMedia = useMemo(() => {
    return allMedia.filter(m => {
      const g = (m.genre || (m.genres ? m.genres.join(' ') : '')).toLowerCase();
      return g.includes('noir') || g.includes('mystery') || g.includes('thriller') || g.includes('crime');
    });
  }, [allMedia]);

  // Animation & CGI
  const animationMedia = useMemo(() => {
    return allMedia.filter(m => {
      const g = (m.genre || (m.genres ? m.genres.join(' ') : '')).toLowerCase();
      return g.includes('animation') || g.includes('cgi') || g.includes('fantasy');
    });
  }, [allMedia]);

  // Comedy & Romance Classics
  const comedyRomanceMedia = useMemo(() => {
    return allMedia.filter(m => {
      const g = (m.genre || (m.genres ? m.genres.join(' ') : '')).toLowerCase();
      return g.includes('comedy') || g.includes('romance') || g.includes('musical');
    });
  }, [allMedia]);

  // TV Series List
  const tvSeriesMedia = useMemo(() => {
    return series;
  }, [series]);

  // Filtered Media if a genre tag is picked
  const availableHomeGenres = ['All', 'Classic', 'Horror', 'Mystery', 'Comedy', 'Sci-Fi', 'Action', 'Drama', 'Romance'];

  const filteredMediaList = useMemo(() => {
    if (selectedGenreFilter === 'All') return null;
    return allMedia.filter(m => {
      const g = (m.genre || (m.genres ? m.genres.join(' ') : '')).toLowerCase();
      return g.includes(selectedGenreFilter.toLowerCase());
    });
  }, [selectedGenreFilter, allMedia]);

  return (
    <PullToRefresh onRefresh={onRefresh || (() => {})}>
      <div id="netflix-home-page" className="min-h-screen bg-[#141414] text-white pb-20">
      {/* Netflix Hero Billboard */}
      <HeroBanner
        media={heroMedia}
        inWatchlist={watchlistIds.has(heroMedia.id)}
        onPlay={onPlay}
        onToggleWatchlist={onToggleWatchlist}
        onMoreInfo={onMoreInfo}
      />

      {/* Genre Filter Sub-Header Bar */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 mb-4 z-20">
        <GenreFilter
          selectedGenre={selectedGenreFilter}
          onSelectGenre={setSelectedGenreFilter}
          availableGenres={availableHomeGenres}
        />
      </div>

      {/* Main Netflix Content Area */}
      <div className="space-y-6 sm:space-y-8 relative z-10">
        {/* If Filter is active, display filtered category view */}
        {filteredMediaList ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#E50914] rounded-full inline-block" />
              {selectedGenreFilter} ({filteredMediaList.length} Titles)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMediaList.map(item => {
                const inWatchlist = watchlistIds.has(item.id);
                const posterUrl = (item as any).thumbnail || (item as any).backdrop || item.poster;
                return (
                  <div
                    key={item.id}
                    onClick={() => onMoreInfo(item)}
                    className="group relative rounded-md overflow-hidden bg-[#181818] border border-zinc-800 cursor-pointer hover:border-[#E50914] hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-900">
                      <img
                        src={posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-[#E50914]">
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                        <span>{item.year}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(item);
                            }}
                            className="p-1 rounded-full bg-white text-black hover:bg-zinc-200"
                            title="Play"
                          >
                            <Play className="w-3 h-3 fill-black ml-0.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(item);
                            }}
                            className="p-1 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
                            title={inWatchlist ? 'Remove' : 'Add'}
                          >
                            {inWatchlist ? <Check className="w-3 h-3 text-[#E50914]" /> : <Plus className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Continue Watching Row (Netflix Style) */}
            {continueWatchingMedia.length > 0 && (
              <div id="continue-watching-row" className="px-4 sm:px-6 lg:px-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#E50914] rounded-full inline-block" />
                    Continue Watching for You
                  </h2>
                </div>

                <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-2">
                  {continueWatchingMedia.map(({ item, progress }) => {
                    const pos = progress.positionSeconds ?? (progress as any).position ?? 0;
                    const dur = progress.durationSeconds ?? (progress as any).duration ?? 1;
                    const percentage = progress.completionPercentage ?? Math.min(100, Math.round((pos / Math.max(dur, 1)) * 100));
                    const posterUrl = (item as any).thumbnail || (item as any).backdrop || item.poster;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onPlay(item, pos)}
                        className="group relative flex-shrink-0 w-56 sm:w-64 rounded-md overflow-hidden bg-[#181818] border border-zinc-800 hover:border-zinc-600 transition-all hover:scale-105 cursor-pointer shadow-xl"
                      >
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
                          <img
                            src={posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-black ml-0.5" />
                            </div>
                          </div>
                          {/* Progress Bar */}
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                            <div
                              className="h-full bg-[#E50914]"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="p-2.5 flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate max-w-[150px]">{item.title}</span>
                          <span className="text-zinc-400 font-mono text-[10px]">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trending Now */}
            <MediaRow
              id="row-trending"
              title="Trending Now"
              subtitle="Most popular on NovaStream this week"
              items={trendingMedia}
              watchlistIds={watchlistIds}
              onPlay={onPlay}
              onToggleWatchlist={onToggleWatchlist}
              onMoreInfo={onMoreInfo}
            />

            {/* Netflix Iconic Top 10 Masterworks Row */}
            <Top10Row
              id="row-top-10"
              title="Top 10 Masterworks Today"
              items={top10Media}
              watchlistIds={watchlistIds}
              onPlay={onPlay}
              onToggleWatchlist={onToggleWatchlist}
              onMoreInfo={onMoreInfo}
            />

            {/* Bollywood Blockbusters & Cinema */}
            {bollywoodMedia.length > 0 && (
              <MediaRow
                id="row-bollywood"
                title="Bollywood Blockbusters & Epics"
                subtitle="High-octane action, heartwarming romances, and award-winning Indian cinema"
                items={bollywoodMedia}
                watchlistIds={watchlistIds}
                onPlay={onPlay}
                onToggleWatchlist={onToggleWatchlist}
                onMoreInfo={onMoreInfo}
              />
            )}

            {/* Hollywood & Sci-Fi Masterpieces */}
            {hollywoodMedia.length > 0 && (
              <MediaRow
                id="row-hollywood"
                title="Hollywood Features & Documentaries"
                subtitle="Acclaimed Western cinema, cyber thrillers, and groundbreaking true stories"
                items={hollywoodMedia}
                watchlistIds={watchlistIds}
                onPlay={onPlay}
                onToggleWatchlist={onToggleWatchlist}
                onMoreInfo={onMoreInfo}
              />
            )}

            {/* Sci-Fi & Action Thrillers */}
            {sciFiActionMedia.length > 0 && (
              <MediaRow
                id="row-scifi"
                title="Sci-Fi & Action Masterpieces"
                subtitle="Thrilling CGI, cyberpunk adventures, and futuristic epics"
                items={sciFiActionMedia}
                watchlistIds={watchlistIds}
                onPlay={onPlay}
                onToggleWatchlist={onToggleWatchlist}
                onMoreInfo={onMoreInfo}
              />
            )}

            {/* Critically Acclaimed Noir & Mystery */}
            {noirMysteryMedia.length > 0 && (
              <MediaRow
                id="row-noir"
                title="Critically Acclaimed Noir & Suspense"
                subtitle="Timeless thrillers, tension-filled mysteries, and dark twists"
                items={noirMysteryMedia}
                watchlistIds={watchlistIds}
                onPlay={onPlay}
                onToggleWatchlist={onToggleWatchlist}
                onMoreInfo={onMoreInfo}
              />
            )}

            {/* Animation & Family */}
            {animationMedia.length > 0 && (
              <MediaRow
                id="row-animation"
                title="Animation & Fantasy Hits"
                subtitle="Open-source 3D animations, family favorites, and short films"
                items={animationMedia}
                watchlistIds={watchlistIds}
                onPlay={onPlay}
                onToggleWatchlist={onToggleWatchlist}
                onMoreInfo={onMoreInfo}
              />
            )}

            {/* Comedy & Romance */}
            {comedyRomanceMedia.length > 0 && (
              <MediaRow
                id="row-comedy"
                title="Romantic Comedies & Classic Favorites"
                subtitle="Sharp wit, golden age charm, and heartwarming stories"
                items={comedyRomanceMedia}
                watchlistIds={watchlistIds}
                onPlay={onPlay}
                onToggleWatchlist={onToggleWatchlist}
                onMoreInfo={onMoreInfo}
              />
            )}

            {/* Binge-Worthy TV Shows */}
            {tvSeriesMedia.length > 0 && (
              <MediaRow
                id="row-tv-shows"
                title="Binge-Worthy TV Series"
                subtitle="Episodic dramas, sci-fi sagas, and multi-season adventures"
                items={tvSeriesMedia}
                watchlistIds={watchlistIds}
                onPlay={onPlay}
                onToggleWatchlist={onToggleWatchlist}
                onMoreInfo={onMoreInfo}
              />
            )}
          </>
        )}
      </div>
    </div>
  </PullToRefresh>
  );
};
