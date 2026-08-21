export interface GeminiRecommendation {
  title: string;
  year: number;
  genre: string;
  mood: string;
  reason: string;
  suggestedYouTubeSearch: string;
  matchedCatalogId?: string;
}

export interface GeminiRecommendationResponse {
  success: boolean;
  headline: string;
  summary: string;
  recommendations: GeminiRecommendation[];
  themes: string[];
}

export interface FetchRecommendationsParams {
  mood?: string;
  genre?: string;
  prompt?: string;
  catalog?: Array<{
    id: string;
    title: string;
    genre?: string;
    synopsis?: string;
    year?: number;
  }>;
}

/**
 * Fetches AI-powered movie and series recommendations from Google Gemini
 * through the server-side API.
 */
export async function fetchGeminiRecommendations(
  params: FetchRecommendationsParams
): Promise<GeminiRecommendationResponse> {
  try {
    const response = await fetch('/api/gemini/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch Gemini recommendations');
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      headline: 'Curated Recommendations',
      summary: 'Showing curated cinematic recommendations based on your preferences.',
      recommendations: [],
      themes: ['Cinema', 'Popular', 'Trending']
    };
  }
}
