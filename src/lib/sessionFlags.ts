const SESSION_ID_KEY = 'furqan:session-id';
const SESSION_PREFIX = 'furqan:session-flag:';
let fallbackSessionId: string | null = null;

function currentSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    fallbackSessionId ??= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return fallbackSessionId;
  }
}

export function isSessionFlagSet(flag: string): boolean {
  try {
    const key = `${SESSION_PREFIX}${currentSessionId()}:${flag}`;
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function setSessionFlag(flag: string): void {
  try {
    const key = `${SESSION_PREFIX}${currentSessionId()}:${flag}`;
    localStorage.setItem(key, 'true');
  } catch {
    // The in-memory UI state still prevents immediate re-opening if storage is unavailable.
  }
}

export function clearSessionFlag(flag: string): void {
  try {
    const key = `${SESSION_PREFIX}${currentSessionId()}:${flag}`;
    localStorage.removeItem(key);
  } catch {
    // Explicit user actions remain available when storage is unavailable.
  }
}
