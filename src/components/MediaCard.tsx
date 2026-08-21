import React, { useState } from 'react';
import { Play, Plus, Check, ChevronDown, ThumbsUp, User } from 'lucide-react';
import { Movie, Series } from '../types';
import { HoverPreviewPoster } from './HoverPreviewPoster';

interface MediaCardProps {
  media: Movie | Series;
  inWatchlist: boolean;
  onPlay: (media: Movie | Series) => void;
  onToggleWatchlist: (media: Movie | Series) => void;
  onMoreInfo: (media: Movie | Series) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  inWatchlist,
  onPlay,
  onToggleWatchlist,
  onMoreInfo
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isMovie = 'runtime' in media;
  const genres = media.genres || ((media as any).genre ? [(media as any).genre] : ['Cinema']);
  
  // Calculate match percentage deterministically from id
  const matchPercent = 92 + (media.id.charCodeAt(media.id.length - 1) % 7);

  const actorPhotos = (media as Movie).actorPhotos || [];
  const primaryCast = media.cast?.slice(0, 2) || [];

  const durationText = isMovie
    ? (media as Movie).duration || `${(media as Movie).runtime || 90}m`
    : `${(media as Series).seasons?.length || 1} Season${((media as Series).seasons?.length || 1) > 1 ? 's' : ''}`;

  return (
    <div
      id={`media-card-${media.id}`}
      onClick={() => onMoreInfo(media)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex-shrink-0 w-48 sm:w-60 md:w-72 rounded-md overflow-hidden bg-[#181818] cursor-pointer transition-all duration-300 hover:scale-105 hover:z-30 hover:shadow-2xl hover:shadow-black/90 border border-zinc-800/80 hover:border-zinc-700 select-none"
    >
      {/* Dynamic Hover-Effect Looping GIF/Video Preview Component */}
      <div className="relative">
        <HoverPreviewPoster
          media={media}
          isHovered={isHovered}
          aspectRatioClass="aspect-[16/9]"
          showBadges={true}
        />

        {/* Actor Portrait Floating Avatars on Hover */}
        {actorPhotos.length > 0 && (
          <div className="absolute bottom-10 right-2 flex -space-x-2 transition-all duration-300 opacity-0 group-hover:opacity-100 pointer-events-none z-20">
            {actorPhotos.slice(0, 2).map((actor, i) => (
              <img
                key={actor.name || i}
                src={actor.avatar}
                alt={actor.name}
                title={actor.name}
                className="w-6 h-6 rounded-full border-2 border-black object-cover shadow-lg"
              />
            ))}
          </div>
        )}

        {/* Bottom Title Overlay on Image */}
        <div className="absolute bottom-2 left-3 right-3 z-10 pointer-events-none">
          <h3 className="font-bold text-white text-sm sm:text-base leading-tight drop-shadow-md truncate">
            {media.title}
          </h3>
        </div>
      </div>

      {/* Netflix Expanded Card Controls & Metadata */}
      <div className="p-3 bg-[#181818] space-y-2.5">
        {/* Action Button Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(media);
              }}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-transform hover:scale-110 shadow-lg cursor-pointer"
              title="Play Now"
            >
              <Play className="w-4 h-4 fill-black ml-0.5" />
            </button>

            {/* Add to List */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(media);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 cursor-pointer ${
                inWatchlist
                  ? 'bg-[#E50914] border-[#E50914] text-white'
                  : 'bg-[#2a2a2a]/80 border-zinc-400 hover:border-white text-white'
              }`}
              title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
            >
              {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>

            {/* Thumbs Up / Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 cursor-pointer ${
                isLiked
                  ? 'bg-white border-white text-black'
                  : 'bg-[#2a2a2a]/80 border-zinc-400 hover:border-white text-white'
              }`}
              title={isLiked ? 'Liked' : 'Like'}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chevron Details */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoreInfo(media);
            }}
            className="w-8 h-8 rounded-full bg-[#2a2a2a]/80 border-2 border-zinc-400 hover:border-white text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
            title="Overview & Details"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Netflix Metadata Row: Match %, Maturity, Duration, HD Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#46d369] font-bold tracking-tight text-[12px]">
            {matchPercent}% Match
          </span>
          <span className="px-1 py-0.2 border border-zinc-500 text-zinc-300 text-[10px] font-semibold rounded-xs">
            {media.rating || 'PG-13'}
          </span>
          <span className="text-zinc-400 text-[11px] font-medium">
            {durationText}
          </span>
          <span className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[9px] font-bold border border-zinc-700">
            HD
          </span>
        </div>

        {/* Star Cast Line */}
        {primaryCast.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 truncate">
            <User className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="truncate">Starring: <strong className="text-zinc-300 font-medium">{primaryCast.join(', ')}</strong></span>
          </div>
        )}

        {/* Genres separated by bullets */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 truncate">
          {genres.slice(0, 3).map((g, idx) => (
            <React.Fragment key={g}>
              <span className="truncate">{g}</span>
              {idx < Math.min(genres.length, 3) - 1 && (
                <span className="text-zinc-600 text-xs">•</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
