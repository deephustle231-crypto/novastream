import React, { useState, useEffect, useRef } from 'react';
import { Film, Tv, Sparkles, Volume2, VolumeX, Play } from 'lucide-react';
import { Movie, Series } from '../types';
import { ShimmerBlock } from './SkeletonLoader';

interface HoverPreviewPosterProps {
  media: Movie | Series;
  isHovered: boolean;
  className?: string;
  aspectRatioClass?: string;
  showBadges?: boolean;
  onMediaLoaded?: () => void;
}

export const HoverPreviewPoster: React.FC<HoverPreviewPosterProps> = ({
  media,
  isHovered,
  className = '',
  aspectRatioClass = 'aspect-[16/9]',
  showBadges = true,
  onMediaLoaded
}) => {
  const isMovie = 'runtime' in media;
  const staticPoster =
    media.poster ||
    (media as any).thumbnail ||
    (media as any).backdrop ||
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop';

  // Determine animated preview URL (supports direct mp4, webm, gif, or movie direct video)
  const animatedUrl =
    (media as any).animated_poster_url ||
    (media as any).animatedCover ||
    (media as any).preview_gif_url ||
    ((media as any).videoUrl?.includes('.mp4') ? (media as any).videoUrl : '') ||
    '';

  const [activePreview, setActivePreview] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  const hoverTimerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isDirectVideo = (url: string) => {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return (
      clean.endsWith('.mp4') ||
      clean.endsWith('.webm') ||
      clean.endsWith('.ogg') ||
      clean.endsWith('.m4v') ||
      clean.includes('commondatastorage.googleapis.com')
    );
  };

  // Snappy hover activation (80ms debounce)
  useEffect(() => {
    if (isHovered && animatedUrl && !previewError) {
      hoverTimerRef.current = setTimeout(() => {
        setActivePreview(true);
        if (isDirectVideo(animatedUrl)) {
          setIsVideoLoading(true);
        }
      }, 80);
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      setActivePreview(false);
      setIsVideoLoading(false);
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isHovered, animatedUrl, previewError]);

  // Video playback controller
  useEffect(() => {
    if (activePreview && videoRef.current && isDirectVideo(animatedUrl)) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoLoading(false);
            if (onMediaLoaded) onMediaLoaded();
          })
          .catch(() => {
            setIsVideoLoading(false);
          });
      }
    }
  }, [activePreview, animatedUrl, onMediaLoaded]);

  const handleVideoError = () => {
    setPreviewError(true);
    setIsVideoLoading(false);
  };

  return (
    <div
      id={`hover-preview-container-${media.id}`}
      className={`relative w-full overflow-hidden bg-[#121212] select-none ${aspectRatioClass} ${className}`}
    >
      {/* 0. Shimmer Skeleton Placeholder while static poster loads */}
      {!isImageLoaded && (
        <div className="absolute inset-0 z-0 bg-zinc-900">
          <ShimmerBlock className="w-full h-full" />
        </div>
      )}

      {/* 1. Base Static Cinema Poster Image */}
      <img
        src={staticPoster}
        alt={media.title}
        onLoad={() => setIsImageLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-500 ease-out relative z-[1] ${
          isImageLoaded ? 'opacity-100' : 'opacity-0'
        } ${
          isHovered ? 'scale-105 brightness-105 contrast-105' : 'scale-100 brightness-95'
        }`}
        loading="lazy"
      />

      {/* 2. Active Looping Animated Poster (GIF / Image Preview) */}
      {activePreview && animatedUrl && !isDirectVideo(animatedUrl) && !previewError && (
        <img
          src={animatedUrl}
          alt={`${media.title} Animated Preview`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out animate-in fade-in"
          onError={() => setPreviewError(true)}
          onLoad={() => onMediaLoaded && onMediaLoaded()}
        />
      )}

      {/* 3. Active Looping Video Preview (.mp4 / .webm) */}
      {activePreview && animatedUrl && isDirectVideo(animatedUrl) && !previewError && (
        <video
          ref={videoRef}
          src={animatedUrl}
          muted={isMuted}
          loop
          autoPlay
          playsInline
          preload="auto"
          onError={handleVideoError}
          onLoadedData={() => {
            setIsVideoLoading(false);
            if (onMediaLoaded) onMediaLoaded();
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
            isVideoLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* Shimmer loading indicator when video is buffering */}
      {isVideoLoading && activePreview && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-7 h-7 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Film Vignette & Cinema Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/40 opacity-80 group-hover:opacity-40 transition-opacity pointer-events-none" />

      {/* Live Preview Indicator Badge on Active Hover */}
      {activePreview && animatedUrl && !previewError && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/85 text-[#E50914] text-[10px] font-black tracking-wider uppercase border border-[#E50914]/50 backdrop-blur-md animate-in fade-in shadow-xl">
          <span className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse inline-block" />
          <span>PLAYING PREVIEW</span>
        </div>
      )}

      {/* Audio Mute / Unmute Toggle for Video Previews */}
      {activePreview && isDirectVideo(animatedUrl) && !isVideoLoading && !previewError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
            if (videoRef.current) {
              videoRef.current.muted = !isMuted;
            }
          }}
          className="absolute bottom-3 right-3 z-30 p-1.5 rounded-full bg-black/80 hover:bg-[#E50914] text-white border border-zinc-700 transition-all hover:scale-110 cursor-pointer shadow-xl backdrop-blur-md"
          title={isMuted ? 'Unmute preview audio' : 'Mute preview audio'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
        </button>
      )}

      {/* Top Badges (Category & Year) */}
      {showBadges && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none z-10">
          <span className="px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-bold border border-zinc-700/80 flex items-center gap-1 backdrop-blur-md shadow-sm">
            {isMovie ? <Film className="w-2.5 h-2.5 text-[#E50914]" /> : <Tv className="w-2.5 h-2.5 text-[#E50914]" />}
            {isMovie ? 'Movie' : 'Series'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/85 text-zinc-300 text-[10px] font-mono border border-zinc-700/80 backdrop-blur-md shadow-sm">
            {media.year}
          </span>
        </div>
      )}

      {/* Featured Nova Top Badge */}
      {showBadges && (media as Movie).isFeatured && (
        <div className="absolute top-2 right-2 pointer-events-none z-10">
          <span className="px-2 py-0.5 rounded bg-[#E50914] text-white text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-1 shadow-lg">
            <Sparkles className="w-2.5 h-2.5" /> NOVA TOP
          </span>
        </div>
      )}
    </div>
  );
};
