import React from 'react';
import { 
  Clapperboard, 
  Skull, 
  Search, 
  Smile, 
  Rocket, 
  Zap, 
  Drama, 
  Heart, 
  Sparkles, 
  Video, 
  Palette, 
  ShieldAlert,
  Flame
} from 'lucide-react';

export interface GenreFilterProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  availableGenres?: string[];
  counts?: Record<string, number>;
  className?: string;
}

export const DEFAULT_GENRES = [
  'All',
  'Classic',
  'Horror',
  'Mystery',
  'Comedy',
  'Sci-Fi',
  'Action',
  'Drama',
  'Romance'
];

const GENRE_ICONS: Record<string, React.ElementType> = {
  All: Sparkles,
  Classic: Clapperboard,
  Horror: Skull,
  Mystery: Search,
  Comedy: Smile,
  'Sci-Fi': Rocket,
  Action: Zap,
  Drama: Drama,
  Romance: Heart,
  Documentary: Video,
  Animation: Palette,
  Thriller: ShieldAlert,
  Trending: Flame
};

export const GenreFilter: React.FC<GenreFilterProps> = ({
  selectedGenre,
  onSelectGenre,
  availableGenres = DEFAULT_GENRES,
  counts,
  className = ''
}) => {
  return (
    <div className={`w-full overflow-x-auto scrollbar-none py-2 ${className}`}>
      <div className="flex items-center gap-2 min-w-max px-1">
        {availableGenres.map((genre) => {
          const isSelected = selectedGenre.toLowerCase() === genre.toLowerCase();
          const IconComponent = GENRE_ICONS[genre] || Sparkles;
          const count = counts ? counts[genre] : undefined;

          return (
            <button
              key={genre}
              type="button"
              id={`genre-filter-${genre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => onSelectGenre(genre)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                isSelected
                  ? 'bg-white text-black ring-2 ring-white/80 shadow-lg scale-105'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80 hover:border-zinc-600 backdrop-blur-md'
              }`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E50914]' : 'text-zinc-400'}`} />
              <span>{genre}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isSelected ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
