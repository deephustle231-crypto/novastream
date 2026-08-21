import React, { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface VideoPlayerProps {
  movie?: {
    id: string | number;
    title: string;
    year?: string | number;
  };
  media?: {
    id: string | number;
    title: string;
    year?: string | number;
  };
  onClose?: () => void;
  onBack?: () => void;
  previousScreenName?: string;
  parentSeries?: any;
  initialPosition?: number;
  onSelectMedia?: (newMed: any) => void;
  onSelectEpisode?: (ser: any, ep: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  movie: propMovie,
  media,
  onClose,
  onBack,
  previousScreenName
}) => {
  const [server, setServer] = useState(1);
  const [tmdbId, setTmdbId] = useState<string | null>(null);

  const activeMovie = propMovie || media || {
    id: 'tt0133093',
    title: 'The Matrix',
    year: '1999'
  };

  // Extract pure numbers or valid tt-prefixed IMDb IDs
  const rawId = String(activeMovie.id).trim();
  const numericOnly = String(activeMovie.id).replace(/[^0-9]/g, '');

  useEffect(() => {
    if (rawId.startsWith('tt')) {
      fetch(`https://api.themoviedb.org/3/find/${rawId}?api_key=15d20e45d5d51121661d7720930f6c24&external_source=imdb_id`)
        .then((res) => res.json())
        .then((data) => {
          if (data.movie_results?.[0]?.id) {
            setTmdbId(String(data.movie_results[0].id));
          } else {
            setTmdbId(numericOnly);
          }
        })
        .catch(() => setTmdbId(numericOnly));
    } else {
      setTmdbId(numericOnly);
    }
  }, [rawId, numericOnly]);

  const activeId = tmdbId || numericOnly;

const servers = [
  { name: 'Server 1 (SmashyStream)', url: `https://embed.smashystream.com/playtor.php?tmdb=${activeId}` },
  { name: 'Server 2 (VidSrc VIP)', url: `https://vidsrc.vip/embed/movie/${activeId}` },
  { name: 'Server 3 (2Embed)', url: `https://www.2embed.cc/embed/${activeId}` },
  { name: 'Server 4 (VidSrc)', url: `https://vidsrc.xyz/embed/movie/${activeId}` },
  { name: 'Server 5 (AutoEmbed)', url: `https://player.autoembed.cc/embed/movie/${activeId}` },
  { name: 'Server 6 (MultiEmbed)', url: `https://multiembed.mov/directstream.php?videoembed=movie&tmdb=${activeId}` },
  { name: 'Archive Stream', url: `https://archive.org/embed/${activeMovie.id}` },
];

  const rawUrl = servers[server - 1]?.url || servers[0].url;
  const currentUrl = rawUrl ? rawUrl.replace('http://', 'https://') : '';
    
  
  const content = (
    <div className="space-y-4 max-w-5xl mx-auto p-2 w-full">
      {(onClose || onBack) && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onBack || onClose}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {previousScreenName || 'Catalogue'}</span>
          </button>

          <button
            type="button"
            onClick={onClose || onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors cursor-pointer text-xs font-bold"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      )}

      <div className="relative aspect-video w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
       <iframe
  key={currentUrl}
  src={currentUrl}
  title={activeMovie.title}
  className="w-full h-full border-0"
  sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
  allowFullScreen
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
/>
      </div>

      <div className="flex justify-between items-center bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
        <div>
          <h2 className="text-lg font-black text-white">{activeMovie.title}</h2>
          {activeMovie.year && <p className="text-xs text-zinc-400 mt-0.5">{activeMovie.year}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Server:</span>
          <select
            value={server}
            onChange={(e) => setServer(Number(e.target.value))}
            className="bg-zinc-800 text-xs text-white border border-zinc-700 rounded-md px-2 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer font-medium"
          >
            {servers.map((s, index) => (
              <option key={index} value={index + 1}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  if (onClose || onBack) {
    return (
      <div
        id="video-player-overlay"
        className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/95 backdrop-blur-md p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start sm:justify-center animate-in fade-in"
      >
        <div className="w-full flex justify-center">{content}</div>
      </div>
    );
  }

  return content;
};
