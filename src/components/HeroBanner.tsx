import React, { useState } from 'react';
import { Play, Plus, Check, Info, Volume2, VolumeX, Sparkles, Film, Tv } from 'lucide-react';
import { Movie, Series } from '../types';

interface HeroBannerProps {
  media: Movie | Series;
  inWatchlist: boolean;
  onPlay: (media: Movie | Series) => void;
  onToggleWatchlist: (media: Movie | Series) => void;
  onMoreInfo: (media: Movie | Series) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  media,
  inWatchlist,
  onPlay,
  onToggleWatchlist,
  onMoreInfo
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const isMovie = 'runtime' in media;
  const genres = media.genres || ((media as any).genre ? [(media as any).genre] : ['Featured']);

  const heroBackdrop =
    (media as any).backdrop ||
    (media as any).thumbnail ||
    media.poster ||
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920&auto=format&fit=crop';

  return (
    <div
      id="cinematic-hero-banner"
      className="relative w-full h-[78vh] min-h-[550px] max-h-[820px] bg-[#141414] overflow-hidden select-none"
    >
      {/* Background Media Poster / Cinematic Backdrop */}
      <div className="absolute inset-0">
        <img
          src={heroBackdrop}
          alt={media.title}
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Deep cinematic Netflix gradient feathering */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#141414]/60 via-transparent to-transparent h-32" />
      </div>

      {/* Hero Content Overlay */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 sm:pb-20 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Netflix Signature N / NOVA ORIGINAL Tag */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[#E50914] uppercase drop-shadow-md">
              <span className="w-5 h-5 bg-[#E50914] text-white rounded-xs flex items-center justify-center font-black text-xs shadow-md">
                N
              </span>
              NOVA ORIGINAL
            </span>

            <span className="text-zinc-500">•</span>

            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              {isMovie ? 'Feature Film' : 'Original Series'}
            </span>

            <span className="text-zinc-500">•</span>

            <span className="text-xs font-semibold text-emerald-400">
              98% Match
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white drop-shadow-2xl leading-[1.05]">
            {media.title}
          </h1>

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-zinc-200 font-normal leading-relaxed line-clamp-3 max-w-xl drop-shadow-md">
            {media.synopsis || media.description}
          </p>

          {/* Genre tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-300">
            {genres.map((g, i) => (
              <React.Fragment key={g}>
                <span className="font-medium drop-shadow-xs">{g}</span>
                {i < genres.length - 1 && <span className="text-zinc-500">•</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Action Buttons (Authentic Netflix Style) */}
          <div className="flex flex-wrap items-center gap-3.5 pt-3">
            {/* Play Button */}
            <button
              id="hero-watch-now-btn"
              onClick={() => onPlay(media)}
              className="flex items-center gap-2.5 px-7 py-3 rounded-md bg-white hover:bg-white/90 text-black font-bold text-base shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-black" />
              <span>Play</span>
            </button>

            {/* More Info Button */}
            <button
              id="hero-more-info-btn"
              onClick={() => onMoreInfo(media)}
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-zinc-600/70 hover:bg-zinc-600/50 text-white font-bold text-base backdrop-blur-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Info className="w-6 h-6 text-white" />
              <span>More Info</span>
            </button>

            {/* Add to List Button */}
            <button
              id="hero-watchlist-toggle-btn"
              onClick={() => onToggleWatchlist(media)}
              className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs ${
                inWatchlist
                  ? 'bg-[#E50914] border-[#E50914] text-white shadow-lg shadow-[#E50914]/40'
                  : 'bg-black/50 border-zinc-300 hover:border-white text-white'
              }`}
              title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
            >
              {inWatchlist ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side Floating Age Rating & Audio Controls */}
      <div className="absolute right-0 bottom-24 hidden sm:flex items-center gap-3.5 z-20">
        {/* Sound Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 rounded-full border border-zinc-400/80 bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all hover:scale-110 cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Maturity Rating Badge */}
        <div className="border-l-4 border-zinc-300 bg-black/60 backdrop-blur-xs px-4 py-1.5 text-xs text-white uppercase font-bold tracking-wider">
          16+
        </div>
      </div>
    </div>
  );
};
