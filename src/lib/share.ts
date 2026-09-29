/**
 * Sharing and clipboard helpers.
 *
 * Uses the OS share sheet where it exists (Web Share API) and falls back to the
 * clipboard, because a desktop browser may expose neither a share sheet nor a
 * granted clipboard permission. Callers get the outcome back so they can show
 * the right feedback and credit XP accordingly.
 */

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable' | 'failed';

export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

interface ShareCapableNavigator extends Navigator {
  share?: (data: ShareData) => Promise<void>;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareContent(payload: SharePayload): Promise<ShareOutcome> {
  const nav = navigator as ShareCapableNavigator;
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title: payload.title, text: payload.text, url: payload.url });
      return 'shared';
    } catch (error) {
      // The reader dismissed the sheet: not a failure, and not something to retry.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else (no permission, unsupported payload) falls through to copy.
    }
  }
  const copied = await copyText(payload.text);
  return copied ? 'copied' : 'unavailable';
}
