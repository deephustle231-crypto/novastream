import { Movie, Series } from '../types';

/**
 * Generate deep-link for a movie or series and share via Web Share API
 * with clipboard copy fallback.
 */
export async function shareMedia(
  media: Movie | Series,
  onFeedback?: (message: string, type: 'success' | 'info' | 'error') => void
): Promise<boolean> {
  const url = new URL(window.location.href);
  url.searchParams.set('media', media.id);
  const deepLink = url.toString();

  const shareTitle = `${media.title} (${media.year}) — NovaStream`;
  const shareText = `Stream "${media.title}" (${media.year}) legally on NovaStream Cinema:\n${media.description.slice(0, 140)}...`;

  // 1. Try Web Share API if available
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: deepLink,
      });
      if (onFeedback) {
        onFeedback(`Shared "${media.title}"`, 'success');
      }
      return true;
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        // User cancelled native share sheet
        return false;
      }
      // On error, fall back to clipboard
    }
  }

  // 2. Clipboard API Fallback
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(deepLink);
      if (onFeedback) {
        onFeedback(`Deep-link for "${media.title}" copied to clipboard!`, 'success');
      }
      return true;
    } else {
      // 3. Fallback for restricted iframe or older environments
      const textarea = document.createElement('textarea');
      textarea.value = deepLink;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (onFeedback) {
        onFeedback(`Deep-link for "${media.title}" copied to clipboard!`, 'success');
      }
      return true;
    }
  } catch (err) {
    if (onFeedback) {
      onFeedback('Unable to copy link to clipboard', 'error');
    }
    return false;
  }
}
