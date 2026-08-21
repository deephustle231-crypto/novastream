import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Check, X, Film, Tv, Clock, User, Award, Share2, Star, ThumbsUp, ArrowLeft, Sparkles, Video } from 'lucide-react';
import { Movie, Series, Episode, MediaRatingSummary } from '../types';
import { shareMedia } from '../utils/share';
import { useToast } from '../context/ToastContext';
import { TrailersTab } from './TrailersTab';

interface MediaDetailModalProps {
  media: Movie | Series;
  inWatchlist: boolean;
  onPlay: (media: Movie | Series, episode?: Episode) => void;
  onToggleWatchlist: (media: Movie | Series) => void;
  onClose: () => void;
  onBack?: () => void;
  previousScreenName?: string;
  initialSeasonNumber?: number;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  inWatchlist,
  onPlay,
  onToggleWatchlist,
  onClose,
  onBack,
  previousScreenName,
  initialSeasonNumber = 1
}) => {
  const { showToast } = useToast();
  const isMovie = 'runtime' in media;
  const series = !isMovie ? (media as Series) : null;
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(initialSeasonNumber);
  const [previewAnimated, setPreviewAnimated] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trailers' | 'episodes'>('overview');

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  // Keyboard shortcut listener (Esc or Alt+Left)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleGoBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, onClose]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [media.id]);

  // Star Rating States
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingSummary, setRatingSummary] = useState<MediaRatingSummary>({
    mediaId: media.id,
    averageRating: 4.8,
    totalRatings: 34
  });
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState<string | null>(null);

  // Load rating from API or local storage cache
  useEffect(() => {
    try {
      const localRatings = localStorage.getItem('novastream_user_ratings');
      if (localRatings) {
        const parsed = JSON.parse(localRatings);
        if (parsed[media.id]) {
          setUserRating(parsed[media.id]);
        }
      }
    } catch (e) { /* ignore */ }

    fetch(`/api/ratings/${media.id}`)
      .then(res => res.ok ? res.json() : null)
      .then((data: MediaRatingSummary | null) => {
        if (data) {
          setRatingSummary(data);
          if (data.userRating) {
            setUserRating(data.userRating);
          }
        }
      })
      .catch(() => {});
  }, [media.id]);

  // Handle User Star Rating Click
  const handleRate = async (score: number) => {
    setUserRating(score);
    setSubmittingRating(true);

    try {
      const localRatings = localStorage.getItem('novastream_user_ratings');
      const ratingsObj = localRatings ? JSON.parse(localRatings) : {};
      ratingsObj[media.id] = score;
      localStorage.setItem('novastream_user_ratings', JSON.stringify(ratingsObj));
    } catch (e) { /* ignore */ }

    try {
      const res = await fetch(`/api/ratings/${media.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score })
      });
      if (res.ok) {
        const updated = await res.json();
        setRatingSummary(updated);
      }
      setRatingFeedback(`Rated ${score}/5 stars!`);
      showToast(`Thank you! You rated "${media.title}" ${score}/5 stars.`, 'success');
      setTimeout(() => setRatingFeedback(null), 3500);
    } catch (err) {
      setRatingFeedback(`Rated ${score}/5 stars (saved offline)`);
      showToast(`Rating of ${score}/5 stars saved locally.`, 'info');
      setTimeout(() => setRatingFeedback(null), 3500);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleShare = async () => {
    await shareMedia(media, showToast);
  };

  const currentSeason = series?.seasons?.find(s => s.seasonNumber === selectedSeasonNumber) || series?.seasons?.[0];
  const genres = media.genres || ((media as any).genre ? [(media as any).genre] : []);
  const movieObj = isMovie ? (media as Movie) : null;
  const actorPhotos = movieObj?.actorPhotos || [];
  const animatedCover = movieObj?.animatedCover;
  const durationString = movieObj?.duration || (movieObj?.runtime ? `${movieObj.runtime}m` : '1h 45m');

  const heroImage = previewAnimated && animatedCover
    ? animatedCover
    : (media as any).backdrop || (media as any).thumbnail || media.poster;

  return (
    <div
      ref={scrollContainerRef}
      id="media-detail-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto overscroll-contain p-3 sm:p-6 md:p-8 touch-pan-y scroll-smooth"
    >
      <div
        id="media-detail-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl mx-auto my-4 sm:my-8 bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-white"
      >
        {/* Navigation Bar: Top Left Back Button */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <button
            id="modal-back-btn"
            onClick={handleGoBack}
            className="flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-full bg-[#141414]/90 hover:bg-[#262626] text-white text-xs sm:text-sm font-bold tracking-wide border border-[#333333] shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#E50914]"
            aria-label="Go back to previous screen"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Back</span>
            {previousScreenName && (
              <span className="hidden sm:inline text-xs text-[#A1A1AA] font-normal">
                to {previousScreenName}
              </span>
            )}
          </button>
        </div>

        {/* Close Button */}
        <button
          id="modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 min-h-[40px] min-w-[40px] rounded-full bg-[#141414]/80 hover:bg-[#262626] text-[#A1A1AA] hover:text-white transition-all border border-[#333333] cursor-pointer shadow-lg flex items-center justify-center"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Backdrop Banner */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-[#000000]">
          <img
            src={heroImage}
            alt={media.title}
            className="w-full h-full object-cover object-center transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />

          {/* Animated Cover Toggle Pill */}
          {animatedCover && (
            <button
              onClick={() => setPreviewAnimated(!previewAnimated)}
              className="absolute top-4 right-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700 backdrop-blur-md transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
              <span>{previewAnimated ? 'Show Static Poster' : 'Motion Cover'}</span>
            </button>
          )}

          {/* Action Overlay on Banner */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-[#E50914] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                  {isMovie ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
                  {isMovie ? 'Movie' : 'TV Series'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1f1f1f]/80 text-[#A1A1AA] text-xs font-mono border border-[#333333]">
                  {media.year}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1f1f1f]/80 text-[#A1A1AA] text-xs font-medium border border-[#333333]">
                  {media.rating || 'PG-13'}
                </span>
                {isMovie && (
                  <span className="px-2 py-0.5 rounded bg-black/60 text-zinc-300 text-xs font-mono border border-zinc-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#E50914]" />
                    {durationString}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-md">
                {media.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="modal-play-primary-btn"
                onClick={() => onPlay(media)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-sm shadow-xl shadow-[#E50914]/25 transition-transform hover:scale-105 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                {isMovie ? 'Play Movie' : 'Start S1 E1'}
              </button>

              <button
                id="modal-watch-trailer-hero-btn"
                onClick={() => setActiveTab('trailers')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all cursor-pointer font-bold text-sm ${
                  activeTab === 'trailers'
                    ? 'bg-[#E50914]/20 border-[#E50914] text-white'
                    : 'bg-[#1f1f1f] hover:bg-[#262626] border-[#333333] hover:border-zinc-500 text-white'
                }`}
                title="Watch promotional trailers and clips"
              >
                <Video className="w-4 h-4 text-[#E50914]" />
                <span>Trailers</span>
              </button>

              <button
                id="modal-watchlist-btn"
                onClick={() => onToggleWatchlist(media)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  inWatchlist
                    ? 'bg-[#E50914]/20 border-[#E50914] text-red-300'
                    : 'bg-[#1f1f1f] border-[#333333] text-[#A1A1AA] hover:text-white hover:bg-[#262626]'
                }`}
                title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              >
                {inWatchlist ? <Check className="w-5 h-5 text-[#E50914]" /> : <Plus className="w-5 h-5" />}
              </button>

              <button
                id="modal-share-btn"
                onClick={handleShare}
                className="p-3 rounded-xl bg-[#1f1f1f] border border-[#333333] text-[#A1A1AA] hover:text-white hover:bg-[#262626] transition-all cursor-pointer"
                title="Share title deep-link"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#262626] pb-3">
            <button
              id="modal-tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-white border border-[#333333]'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              id="modal-tab-trailers"
              onClick={() => setActiveTab('trailers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'trailers'
                  ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/20'
                  : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-white border border-[#333333]'
              }`}
            >
              <Video className="w-4 h-4 text-white" />
              <span>Trailers & Clips</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase tracking-wider font-extrabold ${
                activeTab === 'trailers' ? 'bg-black/30 text-white' : 'bg-[#E50914]/20 text-[#E50914]'
              }`}>
                YouTube
              </span>
            </button>

            {series && series.seasons && series.seasons.length > 0 && (
              <button
                id="modal-tab-episodes"
                onClick={() => setActiveTab('episodes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'episodes'
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-white border border-[#333333]'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Episodes ({series.seasons.reduce((acc, s) => acc + s.episodes.length, 0)})</span>
              </button>
            )}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Synopsis & Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1">
                      Synopsis
                    </h3>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                      {media.synopsis || media.description}
                    </p>
                  </div>

                  {/* Genre Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {genres.map(g => (
                      <span
                        key={g}
                        className="px-3 py-1 rounded-lg bg-[#1f1f1f] text-[#A1A1AA] text-xs font-semibold border border-[#333333]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Star Cast with Real Actor Avatars */}
                  {actorPhotos.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#E50914]" />
                        Featured Cast & Actors
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {actorPhotos.map((actor, idx) => (
                          <div
                            key={actor.name || idx}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-[#181818] border border-zinc-800"
                          >
                            <img
                              src={actor.avatar}
                              alt={actor.name}
                              className="w-10 h-10 rounded-full object-cover border border-zinc-700 shadow-sm shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{actor.name}</p>
                              <p className="text-[10px] text-zinc-400 truncate">Starring Cast</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* USER-DRIVEN STAR RATING COMPONENT */}
                  <div
                    id="user-rating-section"
                    className="p-4 rounded-2xl bg-[#1f1f1f] border border-[#262626] space-y-2.5 mt-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 fill-[#E50914] text-[#E50914]" />
                          Audience Rating & Reviews
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-base font-bold text-white">
                            {ratingSummary.averageRating} / 5.0
                          </span>
                          <span className="text-xs text-[#A1A1AA]">
                            ({ratingSummary.totalRatings} community review{ratingSummary.totalRatings !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </div>

                      {ratingFeedback && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-semibold animate-in fade-in">
                          <ThumbsUp className="w-3 h-3" />
                          {ratingFeedback}
                        </span>
                      )}
                    </div>

                    {/* Interactive Star Selection Bar */}
                    <div className="pt-2 border-t border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white">
                        {userRating > 0 ? (
                          <span>Your Rating: <strong className="text-[#E50914]">{userRating} of 5 Stars</strong></span>
                        ) : (
                          <span className="text-[#A1A1AA]">Tap stars to rate this title:</span>
                        )}
                      </span>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((starIndex) => {
                          const isFilled = (hoverRating || userRating) >= starIndex;
                          return (
                            <button
                              key={starIndex}
                              id={`star-btn-${starIndex}`}
                              type="button"
                              onMouseEnter={() => setHoverRating(starIndex)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => handleRate(starIndex)}
                              disabled={submittingRating}
                              className="p-1 rounded-md hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                              title={`Rate ${starIndex} out of 5 stars`}
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${
                                  isFilled
                                    ? 'fill-[#E50914] text-[#E50914] drop-shadow-xs'
                                    : 'fill-transparent text-[#71717A] hover:text-[#E50914]'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Meta Column */}
                <div className="bg-[#1f1f1f] border border-[#262626] rounded-xl p-4 space-y-3 text-xs">
                  {media.director && (
                    <div>
                      <span className="text-[#A1A1AA] block mb-0.5">Director</span>
                      <span className="text-white font-semibold">{media.director}</span>
                    </div>
                  )}
                  {media.cast && media.cast.length > 0 && (
                    <div>
                      <span className="text-[#A1A1AA] block mb-0.5">Starring</span>
                      <span className="text-white font-semibold">{media.cast.join(', ')}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[#A1A1AA] block mb-0.5">Stream Quality</span>
                    <span className="text-emerald-400 font-bold">1080p HD • Multi-Server</span>
                  </div>
                  <div className="pt-2 border-t border-[#262626]">
                    <span className="text-[#A1A1AA] block mb-0.5">Licence & Rights</span>
                    <div className="flex items-center gap-1.5 text-white font-semibold">
                      <Award className="w-3.5 h-3.5 text-[#E50914] shrink-0" />
                      <span className="truncate">{media.licenceInfo}</span>
                    </div>
                    <span className="text-[10px] text-[#A1A1AA] block mt-1">
                      Verified distribution from: {media.source}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRAILERS & CLIPS */}
          {activeTab === 'trailers' && (
            <TrailersTab media={media} onPlayFullTitle={() => onPlay(media)} />
          )}

          {/* TAB 3: SERIES EPISODES */}
          {(activeTab === 'episodes' || (activeTab === 'overview' && series && series.seasons && series.seasons.length > 0)) && (
            <div className={`space-y-4 ${activeTab === 'overview' ? 'pt-6 border-t border-[#262626]' : 'animate-in fade-in duration-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#E50914]" />
                  Episodes
                </h3>

                {/* Season Dropdown */}
                {series && series.seasons.length > 1 && (
                  <select
                    value={selectedSeasonNumber}
                    onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
                    className="bg-[#1f1f1f] border border-[#333333] text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                  >
                    {series.seasons.map(s => (
                      <option key={s.seasonNumber} value={s.seasonNumber}>
                        Season {s.seasonNumber} ({s.episodes.length} Episodes)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Episodes Grid */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {currentSeason?.episodes.map(ep => (
                  <div
                    key={ep.id}
                    className="group/ep flex items-start sm:items-center justify-between gap-4 p-3 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="relative w-24 sm:w-32 aspect-video rounded-lg overflow-hidden bg-[#1f1f1f] shrink-0">
                        <img
                          src={ep.thumbnail || (series?.poster)}
                          alt={ep.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => series && onPlay(series, ep)}
                          className="absolute inset-0 bg-black/40 group-hover/ep:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Play className="w-5 h-5 fill-white text-white drop-shadow" />
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#E50914]">
                            {ep.episodeNumber}.
                          </span>
                          <h4 className="text-sm font-bold text-white group-hover/ep:text-[#E50914] transition-colors">
                            {ep.title}
                          </h4>
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2 leading-relaxed">
                          {ep.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-[#A1A1AA] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ep.runtime}m
                      </span>
                      <button
                        onClick={() => series && onPlay(series, ep)}
                        className="p-2 rounded-lg bg-[#262626] hover:bg-[#E50914] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                        title="Stream episode"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Back Navigation Bar */}
          <div className="pt-6 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              id="modal-bottom-back-btn"
              onClick={handleGoBack}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-white text-sm font-bold border border-[#333333] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Back to {previousScreenName || (isMovie ? 'Movies Catalogue' : 'TV Shows Catalogue')}</span>
            </button>
            <p className="text-xs text-[#A1A1AA]">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-[#333333] font-mono text-[10px] text-white">Esc</kbd> to return to previous screen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
