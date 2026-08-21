export interface GeminiSearchResponse {
  success: boolean;
  aiExplanation: string;
  matchedMediaIds: string[];
  suggestedQueries: string[];
  themes: string[];
  mood: string;
  recommendedYouTubeSearch: string;
}

export async function askGeminiSearch(
  query: string,
  catalogSummary: Array<{ id: string; title: string; genre?: string; synopsis?: string; year?: number }>
): Promise<GeminiSearchResponse | null> {
  try {
    const res = await fetch('/api/gemini/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        catalog: catalogSummary
      })
    });

    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

