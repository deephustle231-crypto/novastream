import React, { useState, useEffect } from 'react';
import { Play, Film, Sparkles, ExternalLink, Clock, CheckCircle2, Video } from 'lucide-react';
import { Movie, Series, TrailerItem } from '../types';
import { fetchMediaTrailers } from '../utils/trailerService';

interface TrailersTabProps {
  media: Movie | Series;
  onPlayFullTitle?: () => void;
}

export const TrailersTab: React.FC<TrailersTabProps> = ({ media, onPlayFullTitle }) => {
  const [trailers, setTrailers] = useState<TrailerItem[]>([]);
  const [activeTrailer, setActiveTrailer] = useState<TrailerItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);

    fetchMediaTrailers(media)
      .then((items) => {
        if (isMounted) {
          setTrailers(items);
          if (items.length > 0) {
            setActiveTrailer(items[0]);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [media]);

  const handleSelectTrailer = (trailer: TrailerItem) => {
    setActiveTrailer(trailer);
    setIsPlaying(true);
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#A1A1AA]">
        <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Fetching YouTube promotional trailers...</p>
      </div>
    );
  }

  if (trailers.length === 0 || !activeTrailer) {
    return (
      <div className="py-12 px-4 text-center rounded-2xl bg-[#1a1a1a] border border-[#262626] space-y-3">
        <Film className="w-10 h-10 text-[#71717A] mx-auto" />
        <h4 className="text-base font-bold text-white">No Promotional Trailers Available</h4>
        <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
          Trailers for this title are currently being catalogued. You can stream the full feature directly.
        </p>
        {onPlayFullTitle && (
          <button
            onClick={onPlayFullTitle}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[#E50914]/20"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Play Full Title</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="trailers-tab-content" className="space-y-6 animate-in fade-in duration-300">
      {/* Primary Active Trailer Player */}
      <div className="space-y-3">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#333333] shadow-2xl">
          {isPlaying ? (
            <iframe
              id="active-youtube-trailer-iframe"
              src={`https://www.youtube-nocookie.com/embed/${activeTrailer.youtubeId}?autoplay=1&controls=1&rel=0&modestbranding=0&enablejsapi=1&playsinline=1&fs=1`}
              title={activeTrailer.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="relative w-full h-full group cursor-pointer" onClick={() => setIsPlaying(true)}>
              <img
                src={activeTrailer.thumbnailUrl || (media as any).backdrop || media.poster}
                alt={activeTrailer.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

              {/* Central Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E50914] hover:bg-[#b80710] text-white flex items-center justify-center shadow-2xl shadow-[#E50914]/50 group-hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white translate-x-0.5" />
                </div>
              </div>

              {/* Overlay Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                  <Video className="w-3.5 h-3.5 text-[#E50914]" />
                  {activeTrailer.type}
                </span>
                {activeTrailer.quality && (
                  <span className="px-2.5 py-1 rounded-full bg-[#E50914]/90 text-white text-[11px] font-bold shadow-md">
                    {activeTrailer.quality}
                  </span>
                )}
              </div>

              {/* Overlay Details */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-white drop-shadow-md line-clamp-1">
                    {activeTrailer.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-300">
                    {activeTrailer.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#E50914]" />
                        {activeTrailer.duration}
                      </span>
                    )}
                    {activeTrailer.publishDate && <span>• {activeTrailer.publishDate}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Trailer Metadata Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#262626]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-[#262626] text-[#E50914] text-[11px] font-bold uppercase tracking-wider">
                {activeTrailer.type}
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified YouTube Stream
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white truncate">
              {activeTrailer.title}
            </h4>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={activeTrailer.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-[#A1A1AA] hover:text-white transition-colors cursor-pointer border border-[#333333]"
              title="Open video on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Watch on YouTube</span>
            </a>
          </div>
        </div>
      </div>

      {/* Available Trailers & Clips List / Grid */}
      {trailers.length > 1 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
              More Trailers & Promotional Clips ({trailers.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trailers.map((item) => {
              const isSelected = item.id === activeTrailer.id;
              return (
                <div
                  key={item.id}
                  id={`trailer-item-${item.id}`}
                  onClick={() => handleSelectTrailer(item)}
                  className={`group flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#1f1f1f] border-[#E50914] shadow-md shadow-[#E50914]/10 ring-1 ring-[#E50914]'
                      : 'bg-[#1a1a1a] hover:bg-[#222222] border-[#262626]'
                  }`}
                >
                  <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-black shrink-0">
                    <img
                      src={item.thumbnailUrl || (media as any).backdrop || media.poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isSelected ? 'bg-[#E50914] text-white' : 'bg-black/70 text-white'
                      }`}>
                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-[#E50914] uppercase tracking-wider block">
                      {item.type}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#E50914] transition-colors mt-0.5">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#A1A1AA]">
                      {item.duration && <span>{item.duration}</span>}
                      {item.quality && <span>• {item.quality}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
