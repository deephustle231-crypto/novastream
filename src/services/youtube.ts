import { Movie } from '../types';
import { YOUTUBE_MOVIES } from '../data/youtubeMovies';

export async function checkMediaUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export interface YouTubeMovie extends Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  quality: string;
  genre: string;
  poster: string;
  synopsis: string;
  sources: { name: string; url: string }[];
  qualities: { resolution: string; url: string }[];
}

/**
 * Returns verified public domain and full-length feature films without direct googleapis calls.
 */
export const fetchYouTubeMovies = async (_query = 'full length movies public domain'): Promise<YouTubeMovie[]> => {
  try {
    // Return high-quality pre-verified catalogue movies
    return (YOUTUBE_MOVIES as YouTubeMovie[]) || [];
  } catch (error) {
    return [];
  }
};

/**
 * Searches movie catalogue locally or against verified catalogue without making direct Google API calls.
 */
export const searchYouTubeMovies = async (searchQuery: string): Promise<YouTubeMovie[]> => {
  if (!searchQuery || !searchQuery.trim()) return [];
  const q = searchQuery.toLowerCase().trim();

  return (YOUTUBE_MOVIES as YouTubeMovie[]).filter((movie) => {
    const titleMatch = movie.title.toLowerCase().includes(q);
    const descMatch = (movie.description || movie.synopsis || '').toLowerCase().includes(q);
    const genreMatch = (movie.genres || [movie.genre]).some((g) => g.toLowerCase().includes(q));
    const castMatch = movie.cast?.some((c) => c.toLowerCase().includes(q));
    const directorMatch = movie.director?.toLowerCase().includes(q);
    return titleMatch || descMatch || genreMatch || castMatch || directorMatch;
  });
};
