import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Film, Tv, Play, Info, ArrowLeft, Youtube, Loader2, Sparkles, Wand2, Compass, Tag, Flame, Clapperboard, Heart, Skull, Zap } from 'lucide-react';
import { Movie, Series } from '../types';
import { searchYouTubeMovies, YouTubeMovie } from '../services/youtube';
import { askGeminiSearch, GeminiSearchResponse } from '../services/geminiSearch';
import { fetchGeminiRecommendations, GeminiRecommendation, GeminiRecommendationResponse } from '../services/gemini';

interface SearchModalProps {
  movies: Movie[];
  series: Series[];
  onPlay: (media: Movie | Series) => void;
  onMoreInfo: (media: Movie | Series) => void;
  onClose: () => void;
}

const PRESET_MOODS = [
  { label: 'Adrenaline Rush', icon: Flame, color: 'text-orange-400' },
  { label: 'Mind-Bending', icon: Zap, color: 'text-purple-400' },
  { label: 'Dark & Gritty', icon: Skull, color: 'text-red-400' },
  { label: 'Cozy & Chill', icon: Heart, color: 'text-pink-400' },
  { label: 'Late Night Thrill', icon: Clapperboard, color: 'text-emerald-400' },
  { label: 'Epic Sci-Fi', icon: Sparkles, color: 'text-cyan-400' }
];

export const SearchModal: React.FC<SearchModalProps> = ({
  movies,
  series,
  onPlay,
  onMoreInfo,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'all' | 'ai-recommendations' | 'youtube' | 'archive' | 'catalog'>('all');
  const [ytResults, setYtResults] = useState<YouTubeMovie[]>([]);
  const [archiveResults, setArchiveResults] = useState<Movie[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [geminiResult, setGeminiResult] = useState<GeminiSearchResponse | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  // AI Recommendation tab state
  const [selectedMood, setSelectedMood] = useState<string>('Adrenaline Rush');
  const [aiGenre, setAiGenre] = useState<string>('Action');
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [recommendationsData, setRecommendationsData] = useState<GeminiRecommendationResponse | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchSeqRef = useRef<number>(0);

  const allItems = useMemo(() => [...movies, ...series], [movies, series]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(i => {
      if (i.genres && Array.isArray(i.genres)) {
        i.genres.forEach(g => set.add(g));
      }
      if ((i as any).genre && typeof (i as any).genre === 'string') {
        set.add((i as any).genre);
      }
    });
    return ['All', ...Array.from(set)];
  }, [allItems]);

  const catalogSummary = useMemo(() => {
    return allItems.map(item => ({
      id: item.id,
      title: item.title,
      genre: (item as any).genre || (item.genres ? item.genres.join(', ') : 'Cinema'),
      synopsis: item.description || (item as any).synopsis || '',
      year: item.year
    }));
  }, [allItems]);

  const handleFetchRecommendations = async (moodToUse = selectedMood, genreToUse = aiGenre, promptToUse = aiCustomPrompt) => {
    setIsLoadingRecommendations(true);
    try {
      const res = await fetchGeminiRecommendations({
        mood: moodToUse,
        genre: genreToUse === 'All' ? undefined : genreToUse,
        prompt: promptToUse || undefined,
        catalog: catalogSummary
      });
      setRecommendationsData(res);
    } catch (e) {
      // Handled via fallback response in fetchGeminiRecommendations
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Trigger initial recommendations when switching to the tab for the first time
  useEffect(() => {
    if (activeTab === 'ai-recommendations' && !recommendationsData && !isLoadingRecommendations) {
      handleFetchRecommendations(selectedMood, aiGenre, aiCustomPrompt);
    }
  }, [activeTab]);

  const performSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setYtResults([]);
      setArchiveResults([]);
      setGeminiResult(null);
      setIsSearchingYt(false);
      setIsGeminiLoading(false);
      return;
    }

    const currentSeq = ++searchSeqRef.current;
    setIsSearchingYt(true);
    setIsGeminiLoading(true);

    try {
      const [youtubePromise, geminiPromise, archivePromise] = await Promise.allSettled([
        searchYouTubeMovies(trimmed),
        askGeminiSearch(trimmed, catalogSummary),
        fetch(
          `https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(
            trimmed
          )})+AND+mediatype:(movies)&fl[]=identifier,title,year,description&sort[]=downloads+desc&output=json`
        ).then(res => res.json())
      ]);

      // Discard stale responses from earlier keystrokes
      if (currentSeq !== searchSeqRef.current) return;

      let ytMovies: YouTubeMovie[] = [];
      if (youtubePromise.status === 'fulfilled') {
        ytMovies = youtubePromise.value;
        setYtResults(ytMovies);
      }

      if (archivePromise.status === 'fulfilled' && archivePromise.value?.response?.docs) {
        const docs = archivePromise.value.response.docs || [];
        const formattedArchive: Movie[] = docs.map((doc: any) => ({
          id: `archive_${doc.identifier}`,
          title: doc.title || 'Archive Feature',
          description: doc.description ? (Array.isArray(doc.description) ? doc.description[0] : doc.description) : 'Public domain film hosted by the Internet Archive.',
          year: doc.year ? parseInt(String(doc.year), 10) : 1960,
          genres: ['Classic Archive', 'Public Domain'],
          poster: `https://archive.org/services/img/${doc.identifier}`,
          backdrop: `https://archive.org/services/img/${doc.identifier}`,
          videoUrl: `https://archive.org/embed/${doc.identifier}`,
          rating: 'PG',
          runtime: 90,
          sources: [
            { name: 'Server 1 (Archive Embed)', url: `https://archive.org/embed/${doc.identifier}` },
            { name: 'Archive Direct Stream', url: `https://archive.org/embed/${doc.identifier}` }
          ]
        }));
        setArchiveResults(formattedArchive);
      }

      if (geminiPromise.status === 'fulfilled' && geminiPromise.value) {
        const geminiData = geminiPromise.value;
        setGeminiResult(geminiData);

        if (geminiData.recommendedYouTubeSearch && ytMovies.length < 4) {
          searchYouTubeMovies(geminiData.recommendedYouTubeSearch).then(extraYt => {
            if (currentSeq === searchSeqRef.current && extraYt.length > 0) {
              setYtResults(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const filtered = extraYt.filter(e => !existingIds.has(e.id));
                return [...prev, ...filtered];
              });
            }
          });
        }
      }
    } finally {
      if (currentSeq === searchSeqRef.current) {
        setIsSearchingYt(false);
        setIsGeminiLoading(false);
      }
    }
  };

  // Debounced real-time search (250ms for responsive, non-blocking live search)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      searchSeqRef.current++;
      setYtResults([]);
      setGeminiResult(null);
      setIsSearchingYt(false);
      setIsGeminiLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const handleManualSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    performSearch(query);
  };

  const filteredCatalogItems = useMemo(() => {
    const geminiMatchedSet = new Set(geminiResult?.matchedMediaIds || []);

    const matched = allItems.filter(item => {
      const isGeminiMatch = geminiMatchedSet.has(item.id);
      const matchesQuery =
        !query ||
        isGeminiMatch ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase())) ||
        (item.director && item.director.toLowerCase().includes(query.toLowerCase())) ||
        (item.cast && item.cast.some(c => c.toLowerCase().includes(query.toLowerCase())));

      const isAll = !selectedGenre || selectedGenre === 'All' || selectedGenre.toLowerCase() === 'all';
      const itemGenres = item.genres || ((item as any).genre ? [(item as any).genre] : []);
      const matchesGenre = isAll || itemGenres.some(g => g.toLowerCase() === selectedGenre.toLowerCase());
      return matchesQuery && matchesGenre;
    });

    if (geminiMatchedSet.size > 0) {
      return matched.sort((a, b) => {
        const aMatch = geminiMatchedSet.has(a.id);
        const bMatch = geminiMatchedSet.has(b.id);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }

    return matched;
  }, [allItems, query, selectedGenre, geminiResult]);

  const displayedResults = useMemo(() => {
    if (activeTab === 'youtube') return ytResults;
    if (activeTab === 'archive') return archiveResults;
    if (activeTab === 'catalog') return filteredCatalogItems;
    return [...ytResults, ...archiveResults, ...filteredCatalogItems];
  }, [activeTab, ytResults, archiveResults, filteredCatalogItems]);

  const samplePrompts = [
    'Mind-bending sci-fi with time travel',
    '80s cyberpunk action movies',
    'Classic noir detective mystery',
    'Feel-good comedy for movie night',
    'High adrenaline space odyssey'
  ];

  const handlePlayRecommendation = async (rec: GeminiRecommendation) => {
    if (rec.matchedCatalogId) {
      const item = allItems.find(i => i.id === rec.matchedCatalogId);
      if (item) {
        onPlay(item);
        onClose();
        return;
      }
    }
    // Search YouTube stream for this title
    const searchTarget = rec.suggestedYouTubeSearch || `${rec.title} full movie`;
    const liveResults = await searchYouTubeMovies(searchTarget);
    if (liveResults.length > 0) {
      onPlay(liveResults[0] as any);
      onClose();
    } else {
      // Fallback pseudo movie
      onPlay({
        id: `rec-${Date.now()}`,
        title: rec.title,
        description: rec.reason,
        year: rec.year || 2024,
        genres: [rec.genre],
        poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
        videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTarget)}`,
        rating: 'PG-13',
        runtime: 110,
        featured: false
      } as any);
      onClose();
    }
  };

  return (
    <div
      id="search-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain touch-pan-y text-white"
    >
      <div
        id="search-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden my-6 sm:my-10 animate-in fade-in slide-in-from-top-4 duration-200"
      >
        {/* Search Input Bar */}
        <form onSubmit={handleManualSearchSubmit} className="p-4 sm:p-6 border-b border-[#262626] flex items-center gap-3">
          <button
            type="button"
            id="search-back-btn"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-white text-xs font-bold uppercase tracking-wider border border-[#333333] transition-all cursor-pointer shrink-0 active:scale-95"
            aria-label="Back to previous screen"
            title="Back to previous screen (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back</span>
          </button>

          <div className="relative flex-1 flex items-center">
            <Search className="w-5 h-5 text-[#A1A1AA] absolute left-0 shrink-0 pointer-events-none" />
            <input
              ref={inputRef}
              key="global-live-search-input"
              id="global-live-search-input"
              name="searchQuery"
              type="text"
              placeholder="Ask Google Gemini or search any title, mood, or plot..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-white text-sm sm:text-base pl-8 pr-8 focus:outline-none placeholder:text-zinc-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setGeminiResult(null);
                  setYtResults([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-0 p-1 rounded-full text-[#A1A1AA] hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(isSearchingYt || isGeminiLoading) && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold shrink-0">
              <Loader2 className="w-4 h-4 text-[#E50914] animate-spin" />
              <span className="hidden sm:inline">AI Searching...</span>
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold text-white bg-[#E50914] hover:bg-[#b80710] rounded-xl cursor-pointer transition-all shadow-md shadow-[#E50914]/20 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        {/* Gemini AI Insight Card when query is active */}
        {geminiResult && activeTab !== 'ai-recommendations' && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl bg-gradient-to-r from-[#1e1424] via-[#1a1a1a] to-[#141414] border border-[#E50914]/30 shadow-lg space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914] text-[11px] font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#E50914]" />
                  Google Gemini AI
                </span>
                {geminiResult.mood && (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-semibold">
                    Mood: {geminiResult.mood}
                  </span>
                )}
              </div>

              {geminiResult.themes && geminiResult.themes.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-400">
                  <Tag className="w-3 h-3 text-red-400" />
                  <span>{geminiResult.themes.slice(0, 3).join(' • ')}</span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
              {geminiResult.aiExplanation}
            </p>

            {geminiResult.suggestedQueries && geminiResult.suggestedQueries.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[11px] text-zinc-400 shrink-0 flex items-center gap-1 font-semibold">
                  <Wand2 className="w-3 h-3 text-[#E50914]" />
                  Try:
                </span>
                {geminiResult.suggestedQueries.map((sq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(sq);
                      performSearch(sq);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-[#E50914]/20 border border-zinc-700 hover:border-[#E50914]/60 text-zinc-300 hover:text-white text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Source Tabs */}
        <div className="p-3 sm:px-6 bg-[#1a1a1a] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#141414] p-1 rounded-xl border border-[#262626]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              All ({displayedResults.length})
            </button>
            <button
              onClick={() => setActiveTab('ai-recommendations')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ai-recommendations'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>AI Recommendation</span>
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'youtube'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" />
              Live YouTube ({ytResults.length})
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Archive Movies ({archiveResults.length})
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#262626] text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Catalog ({filteredCatalogItems.length})
            </button>
          </div>

          {/* Genre Filter for standard tabs */}
          {activeTab !== 'ai-recommendations' && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full">
              {genres.slice(0, 6).map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedGenre === g
                      ? 'bg-[#E50914] text-white shadow-sm'
                      : 'bg-[#1f1f1f] text-[#A1A1AA] hover:text-white hover:bg-[#262626] border border-[#333333]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI RECOMMENDATION TAB VIEW */}
        {activeTab === 'ai-recommendations' ? (
          <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Mood & Genre Selector Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#1c1822] to-[#161616] border border-[#2b2538] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#E50914]/20 border border-[#E50914]/40">
                    <Sparkles className="w-4 h-4 text-[#E50914]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Ask Google Gemini for Recommendations</h3>
                    <p className="text-xs text-zinc-400">Choose your mood or genre vibe to generate tailored suggestions.</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFetchRecommendations()}
                  disabled={isLoadingRecommendations}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isLoadingRecommendations ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>Generate Picks</span>
                </button>
              </div>

              {/* Mood Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Select Mood / Vibe</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_MOODS.map(m => {
                    const Icon = m.icon;
                    const isSelected = selectedMood === m.label;
                    return (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => {
                          setSelectedMood(m.label);
                          handleFetchRecommendations(m.label, aiGenre, aiCustomPrompt);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#E50914]/20 border-[#E50914] text-white shadow-sm'
                            : 'bg-[#1a1a1a] hover:bg-[#222222] border-[#2e2e2e] text-zinc-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${m.color} shrink-0`} />
                        <span className="text-xs font-semibold truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Genre Selector & Custom Prompt Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Genre</label>
                  <select
                    value={aiGenre}
                    onChange={(e) => {
                      setAiGenre(e.target.value);
                      handleFetchRecommendations(selectedMood, e.target.value, aiCustomPrompt);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-[#2e2e2e] text-xs font-semibold text-white focus:outline-none focus:border-[#E50914]"
                  >
                    <option value="All">All Genres</option>
                    <option value="Action">Action & Adventure</option>
                    <option value="Sci-Fi">Sci-Fi & Cyberpunk</option>
                    <option value="Thriller">Psychological Thriller</option>
                    <option value="Horror">Horror & Suspense</option>
                    <option value="Crime">Crime & Noir</option>
                    <option value="Comedy">Comedy & Feel-Good</option>
                    <option value="Drama">Award-Winning Drama</option>
                    <option value="Animation">Animation & Anime</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Custom Request (Optional)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. 90s time travel movie..."
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchRecommendations(selectedMood, aiGenre, aiCustomPrompt);
                        }
                      }}
                      className="w-full p-2 rounded-xl bg-[#141414] border border-[#2e2e2e] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations List Area */}
            {isLoadingRecommendations ? (
              <div className="text-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mx-auto" />
                <p className="text-sm font-medium text-zinc-300">Gemini is analyzing cinema databases and catalog vibes...</p>
              </div>
            ) : recommendationsData && recommendationsData.recommendations.length > 0 ? (
              <div className="space-y-4">
                {/* Result Headline Banner */}
                <div className="p-3.5 rounded-xl bg-[#1a1622] border border-[#3b2a4a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      {recommendationsData.headline}
                    </h4>
                    <p className="text-xs text-zinc-300 mt-0.5">{recommendationsData.summary}</p>
                  </div>
                  {recommendationsData.themes && recommendationsData.themes.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {recommendationsData.themes.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-300 whitespace-nowrap">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendation Cards */}
                <div className="grid grid-cols-1 gap-3">
                  {recommendationsData.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#202020] border border-[#2e2e2e] hover:border-[#E50914]/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-sm text-white group-hover:text-[#E50914] transition-colors">
                            {rec.title}
                          </h5>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40">
                            {rec.mood}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {rec.year} • {rec.genre}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-normal leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handlePlayRecommendation(rec)}
                          className="px-3 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#E50914]/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Stream Now</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <Compass className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm text-zinc-400">Select your preferred mood or genre above to discover movie recommendations.</p>
              </div>
            )}
          </div>
        ) : (
          /* STANDARD SEARCH RESULTS LIST */
          <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 space-y-3">
            {/* Quick Suggestion Prompts when search is empty */}
            {!query && (
              <div className="p-4 rounded-xl bg-[#181818]/60 border border-[#262626] mb-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <Compass className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>Google Gemini AI Movie Discovery</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {samplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(prompt);
                        performSearch(prompt);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-[#E50914] text-zinc-300 hover:text-white border border-zinc-800 hover:border-[#E50914] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3 h-3 text-[#E50914]" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {displayedResults.length > 0 ? (
              displayedResults.map(item => {
                const isMovie = 'runtime' in item;
                const isYouTubeLive = item.id.startsWith('yt-');
                const isArchive = item.id.startsWith('archive_');
                const isGeminiMatch = geminiResult?.matchedMediaIds?.includes(item.id);
                const genresList = item.genres || ((item as any).genre ? [(item as any).genre] : []);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onMoreInfo(item);
                      onClose();
                    }}
                    className={`group flex items-center justify-between gap-4 p-3 rounded-xl transition-all cursor-pointer border ${
                      isGeminiMatch
                        ? 'bg-[#1a141c] hover:bg-[#231b26] border-[#E50914]/40 shadow-sm'
                        : 'bg-[#1a1a1a] hover:bg-[#222222] border-[#262626] hover:border-[#E50914]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                      <img
                        src={(item as any).thumbnail || (item as any).backdrop || item.poster}
                        alt={item.title}
                        className="w-16 sm:w-24 aspect-video object-cover rounded-lg bg-[#1f1f1f] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white group-hover:text-[#E50914] transition-colors truncate">
                            {item.title}
                          </h4>
                          {isGeminiMatch && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40 flex items-center gap-1 shrink-0">
                              <Sparkles className="w-3 h-3 text-[#E50914]" />
                              Gemini Match
                            </span>
                          )}
                          {isYouTubeLive ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40 flex items-center gap-1 shrink-0">
                              <Youtube className="w-3 h-3" />
                              YouTube Live
                            </span>
                          ) : isArchive ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                              <Film className="w-3 h-3" />
                              Archive Stream
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1f1f1f] text-[#A1A1AA] border border-[#333333] shrink-0">
                              {isMovie ? 'Movie' : 'TV Series'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1AA] line-clamp-1 mt-0.5 font-normal">
                          {item.description || (item as any).synopsis}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] mt-1 font-mono">
                          <span>{item.year}</span>
                          <span>•</span>
                          <span>{genresList.slice(0, 2).join(', ') || 'Cinema'}</span>
                          <span>•</span>
                          <span className="text-emerald-400">1080p HD</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(item);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white transition-colors cursor-pointer shadow-sm flex items-center gap-1 text-xs font-bold"
                        title="Play stream now"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span className="hidden sm:inline">Play</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 space-y-3">
                <Search className="w-10 h-10 text-[#A1A1AA] mx-auto opacity-30" />
                <p className="text-sm text-[#A1A1AA]">
                  {query ? `No matching movies or streams found for "${query}".` : 'Ask Google Gemini or type any movie title or genre to search in real-time.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};



