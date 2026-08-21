import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
let quotaExceededCooldownUntil = 0;

// In-memory cache for search queries and recommendations to optimize quota usage
const searchCache = new Map<string, { data: GeminiSearchResult; timestamp: number }>();
const recsCache = new Map<string, { data: GeminiRecommendationsResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

export interface GeminiSearchResult {
  aiExplanation: string;
  matchedMediaIds: string[];
  suggestedQueries: string[];
  themes: string[];
  mood: string;
  recommendedYouTubeSearch: string;
}

export interface GeminiRecommendationItem {
  title: string;
  year: number;
  genre: string;
  mood: string;
  reason: string;
  suggestedYouTubeSearch: string;
  matchedCatalogId?: string;
}

export interface GeminiRecommendationsResult {
  headline: string;
  summary: string;
  recommendations: GeminiRecommendationItem[];
  themes: string[];
}

export async function searchWithGemini(
  query: string,
  catalog: Array<{ id: string; title: string; genre?: string; synopsis?: string; year?: number }>
): Promise<GeminiSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      aiExplanation: 'Enter a prompt or search query to get AI-powered cinematic recommendations.',
      matchedMediaIds: [],
      suggestedQueries: [],
      themes: [],
      mood: 'Neutral',
      recommendedYouTubeSearch: ''
    };
  }

  const cacheKey = trimmed.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const now = Date.now();
  const isCooldown = now < quotaExceededCooldownUntil;
  const ai = !isCooldown ? getGeminiClient() : null;

  if (ai) {
    try {
      const catalogContext = catalog.slice(0, 40).map(m => ({
        id: m.id,
        title: m.title,
        genre: m.genre || 'General',
        synopsis: (m.synopsis || '').slice(0, 140),
        year: m.year || 2024
      }));

      const prompt = `You are the Google Gemini AI search assistant for the NovaStream cinema and movie streaming platform.
A user entered the search prompt: "${trimmed}".

Here is the current catalogue of available movies and series on NovaStream:
${JSON.stringify(catalogContext, null, 2)}

Analyze the user's intent, mood, genre preferences, actor requests, or plot descriptions.
Respond ONLY with a valid JSON object matching this schema:
{
  "aiExplanation": "A 1-2 sentence warm, cinematic explanation of what you found or recommended for their query.",
  "matchedMediaIds": ["array of exact id strings from the provided catalogue that match the user's query or vibe best, ordered by relevance"],
  "suggestedQueries": ["3 related smart search queries the user might want to try next"],
  "themes": ["3 to 5 keywords/themes e.g. 'Cyberpunk', 'Mind-Bending', '90s Action'"],
  "mood": "Single word or short phrase capturing the emotional vibe e.g. 'Adrenaline Thrill', 'Thought-Provoking', 'Nostalgic'",
  "recommendedYouTubeSearch": "The most effective YouTube search term to find verified full-length movies matching this query, e.g. '${trimmed} full movie HD'"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '';
      if (text) {
        const parsed = JSON.parse(text);
        const result: GeminiSearchResult = {
          aiExplanation: parsed.aiExplanation || `Here are the top matches curated by Gemini for "${trimmed}".`,
          matchedMediaIds: Array.isArray(parsed.matchedMediaIds) ? parsed.matchedMediaIds : [],
          suggestedQueries: Array.isArray(parsed.suggestedQueries) ? parsed.suggestedQueries : [],
          themes: Array.isArray(parsed.themes) ? parsed.themes : [],
          mood: parsed.mood || 'Cinematic',
          recommendedYouTubeSearch: parsed.recommendedYouTubeSearch || `${trimmed} full movie`
        };

        searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        // Set a 45-second cooldown to avoid repeated quota exhaustion re-triggers
        quotaExceededCooldownUntil = Date.now() + 45000;
      }
      // Handled cleanly via fallback below without crashing
    }
  }

  // High-fidelity smart fallback when quota is reached or network is unavailable
  const qLower = trimmed.toLowerCase();
  const matched = catalog.filter(m => {
    const titleMatch = m.title.toLowerCase().includes(qLower);
    const genreMatch = (m.genre || '').toLowerCase().includes(qLower);
    const synopsisMatch = (m.synopsis || '').toLowerCase().includes(qLower);
    return titleMatch || genreMatch || synopsisMatch;
  });

  const fallbackResult: GeminiSearchResult = {
    aiExplanation: matched.length > 0
      ? `Curated cinematic matches for "${trimmed}" across title, genre, and synopsis catalog entries.`
      : `Looking for titles related to "${trimmed}". Explore our streaming catalog or stream live streams below.`,
    matchedMediaIds: matched.map(m => m.id),
    suggestedQueries: [
      `${trimmed} action`,
      `classic ${trimmed}`,
      `sci-fi ${trimmed}`
    ],
    themes: ['Streaming', 'Curated', 'NovaStream Original'],
    mood: 'Cinematic',
    recommendedYouTubeSearch: `${trimmed} full movie`
  };

  searchCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
  return fallbackResult;
}

export async function recommendWithGemini(params: {
  mood?: string;
  genre?: string;
  prompt?: string;
  catalog: Array<{ id: string; title: string; genre?: string; synopsis?: string; year?: number }>;
}): Promise<GeminiRecommendationsResult> {
  const { mood, genre, prompt: customPrompt, catalog } = params;
  const cacheKey = `${mood || 'any'}_${genre || 'any'}_${(customPrompt || '').toLowerCase()}`;
  const cached = recsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const now = Date.now();
  const isCooldown = now < quotaExceededCooldownUntil;
  const ai = !isCooldown ? getGeminiClient() : null;

  if (ai) {
    try {
      const catalogContext = catalog.slice(0, 40).map(m => ({
        id: m.id,
        title: m.title,
        genre: m.genre || 'General',
        synopsis: (m.synopsis || '').slice(0, 140),
        year: m.year || 2024
      }));

      const instructionPrompt = `You are the Google Gemini AI Movie Recommender for NovaStream streaming.
The user is requesting personalized cinematic recommendations.
User Mood / Vibe: "${mood || 'Any'}"
User Genre Preference: "${genre || 'Any'}"
User Custom Note: "${customPrompt || 'Curate the best cinematic titles'}"

Available Catalogue:
${JSON.stringify(catalogContext, null, 2)}

Provide 4 to 6 compelling movie/series recommendations matching this mood and genre.
Include both titles from the catalogue (providing matchedCatalogId when applicable) as well as classic/popular cinematic gems.
Respond ONLY with a valid JSON object matching this schema:
{
  "headline": "A short, catchy cinematic headline like 'Neon-Drenched Cyberpunk Odyssey' or 'Mind-Bending Psychological Thrillers'",
  "summary": "2 sentences explaining why these films match the user's selected mood and genre.",
  "themes": ["3 to 5 extracted themes/tags"],
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2023,
      "genre": "Genre",
      "mood": "Mood description",
      "reason": "Why this movie is great for this mood",
      "suggestedYouTubeSearch": "Search term to find the movie or trailer on YouTube",
      "matchedCatalogId": "Optional ID from catalogue if this matches a catalogue entry"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: instructionPrompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '';
      if (text) {
        const parsed = JSON.parse(text);
        const result: GeminiRecommendationsResult = {
          headline: parsed.headline || `${mood || genre || 'Curated'} Cinema Picks`,
          summary: parsed.summary || 'Handpicked by Google Gemini based on your preferences.',
          themes: Array.isArray(parsed.themes) ? parsed.themes : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        };

        recsCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        quotaExceededCooldownUntil = Date.now() + 45000;
      }
      // Handled cleanly via fallback below without crashing
    }
  }

  // Fallback if API key not set or quota reached
  const filtered = catalog.filter(m => {
    const gMatch = !genre || genre === 'All' || (m.genre || '').toLowerCase().includes(genre.toLowerCase());
    const mMatch = !mood || (m.synopsis || '').toLowerCase().includes(mood.toLowerCase()) || (m.genre || '').toLowerCase().includes(mood.toLowerCase());
    return gMatch || mMatch;
  }).slice(0, 5);

  const fallbackRecs: GeminiRecommendationsResult = {
    headline: `${mood || genre || 'Top Curated'} Recommendations`,
    summary: `Curated selections tailored for ${mood ? `${mood} mood` : ''} ${genre ? `in ${genre}` : ''}.`,
    themes: [mood || 'Classic', genre || 'Cinema', 'Featured', 'NovaStream'],
    recommendations: filtered.map(m => ({
      title: m.title,
      year: m.year || 2024,
      genre: m.genre || 'Cinema',
      mood: mood || 'Engaging',
      reason: m.synopsis ? m.synopsis.slice(0, 100) + '...' : 'A captivating cinematic experience on NovaStream.',
      suggestedYouTubeSearch: `${m.title} full movie HD`,
      matchedCatalogId: m.id
    }))
  };

  recsCache.set(cacheKey, { data: fallbackRecs, timestamp: Date.now() });
  return fallbackRecs;
}

