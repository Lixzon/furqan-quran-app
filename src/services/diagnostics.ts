const diagnosticsReportEndpoint = import.meta.env?.VITE_DIAGNOSTICS_REPORT_ENDPOINT?.trim() ?? '';
const EVENTS_KEY = 'furqan:diagnostics:events:v1';
const REPORTS_KEY = 'furqan:diagnostics:reports:v1';
const EVENT_LIMIT = 120;
const REPORT_LIMIT = 26;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type DiagnosticKind =
  | 'react-crash'
  | 'unhandled-error'
  | 'unhandled-rejection'
  | 'audio-stream'
  | 'memorization-tracking'
  | 'assistant-service'
  | 'performance';

export interface DiagnosticEvent {
  id: string;
  at: number;
  kind: DiagnosticKind;
  fingerprint: string;
  message: string;
  stack: string;
  durationMs?: number;
}

export interface DiagnosticDigest {
  id: string;
  createdAt: number;
  weekEnding: string;
  windowStart: number;
  windowEnd: number;
  totalEvents: number;
  counts: Record<DiagnosticKind, number>;
  topIssues: Array<{ fingerprint: string; kind: DiagnosticKind; message: string; count: number }>;
  performance: { longTaskCount: number; maximumLongTaskMs: number };
  deliveryStatus?: 'pending' | 'sent' | 'not-configured' | 'failed';
}

export interface UserHealthCheckResult {
  hasIssue: boolean;
  reportSent: boolean;
  failureReason?: 'not-configured' | 'network' | 'server';
}

const kinds: DiagnosticKind[] = [
  'react-crash',
  'unhandled-error',
  'unhandled-rejection',
  'audio-stream',
  'memorization-tracking',
  'assistant-service',
  'performance',
];

let memoryEvents: DiagnosticEvent[] = [];
let memoryReports: DiagnosticDigest[] = [];
let captureStarted = false;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isDiagnosticEvent(value: unknown): value is DiagnosticEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === 'string' &&
    typeof event.at === 'number' &&
    Number.isFinite(event.at) &&
    typeof event.kind === 'string' &&
    kinds.includes(event.kind as DiagnosticKind) &&
    typeof event.fingerprint === 'string' &&
    typeof event.message === 'string' &&
    typeof event.stack === 'string'
  );
}

function isDiagnosticDigest(value: unknown): value is DiagnosticDigest {
  if (typeof value !== 'object' || value === null) return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.id === 'string' &&
    typeof report.createdAt === 'number' &&
    typeof report.weekEnding === 'string' &&
    typeof report.totalEvents === 'number' &&
    typeof report.counts === 'object' &&
    report.counts !== null &&
    Array.isArray(report.topIssues) &&
    typeof report.performance === 'object' &&
    report.performance !== null
  );
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep diagnostics in memory for the current page if storage is unavailable.
  }
}

function sanitize(value: string, maxLength: number): string {
  return value
    .replace(/https?:\/\/[^\s)]+/gi, '[url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\b/gi, '[id]')
    .replace(/(?:[A-Z]:\\|\/(?:Users|home|private|var|tmp)\/)[^\s):]+/gi, '[path]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizedStack(stack: string): string {
  return stack
    .split('\n')
    .map((line) => sanitize(line, 180))
    .filter(Boolean)
    .slice(0, 8)
    .join('\n');
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

function currentEvents(): DiagnosticEvent[] {
  const stored = readJson<unknown>(EVENTS_KEY, []);
  const valid = Array.isArray(stored) ? stored.filter(isDiagnosticEvent) : [];
  return memoryEvents.length > 0 ? memoryEvents : valid;
}

function currentReports(): DiagnosticDigest[] {
  const stored = readJson<unknown>(REPORTS_KEY, []);
  const valid = Array.isArray(stored) ? stored.filter(isDiagnosticDigest) : [];
  return memoryReports.length > 0 ? memoryReports : valid;
}

export function recordDiagnostic(
  kind: DiagnosticKind,
  message: string,
  stack = '',
  durationMs?: number,
): void {
  const safeMessage = sanitize(message, 180) || 'Unspecified application error';
  const safeStack = sanitizedStack(stack);
  const signature = `${kind}|${safeMessage}|${safeStack.split('\n').slice(0, 3).join('|')}`;
  const event: DiagnosticEvent = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    kind,
    fingerprint: hash(signature),
    message: safeMessage,
    stack: safeStack,
    ...(Number.isFinite(durationMs) ? { durationMs: Math.max(0, Math.round(durationMs!)) } : {}),
  };
  const events = [...currentEvents(), event].slice(-EVENT_LIMIT);
  memoryEvents = events;
  writeJson(EVENTS_KEY, events);
}

export function readDiagnosticEvents(): DiagnosticEvent[] {
  return currentEvents().slice().sort((a, b) => b.at - a.at);
}

export function readDiagnosticDigests(): DiagnosticDigest[] {
  return currentReports().slice().sort((a, b) => b.createdAt - a.createdAt);
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fridayOfWeek(date: Date): string {
  const friday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (friday.getDay() - 5 + 7) % 7;
  friday.setDate(friday.getDate() - offset);
  return localDateKey(friday);
}

export function createDiagnosticDigest(now = Date.now()): DiagnosticDigest {
  const windowEnd = now;
  const windowStart = windowEnd - WEEK_MS;
  const events = currentEvents().filter((event) => event.at >= windowStart && event.at <= windowEnd);
  const counts = Object.fromEntries(kinds.map((kind) => [kind, 0])) as Record<DiagnosticKind, number>;
  const grouped = new Map<string, DiagnosticDigest['topIssues'][number]>();
  const longTasks: number[] = [];

  for (const event of events) {
    counts[event.kind] += 1;
    if (event.kind === 'performance' && event.durationMs !== undefined) longTasks.push(event.durationMs);
    const existing = grouped.get(event.fingerprint);
    if (existing) existing.count += 1;
    else grouped.set(event.fingerprint, {
      fingerprint: event.fingerprint,
      kind: event.kind,
      message: event.message,
      count: 1,
    });
  }

  const digest: DiagnosticDigest = {
    id: `${fridayOfWeek(new Date(now))}-${now.toString(36)}`,
    createdAt: now,
    weekEnding: fridayOfWeek(new Date(now)),
    windowStart,
    windowEnd,
    totalEvents: events.length,
    counts,
    topIssues: [...grouped.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    performance: {
      longTaskCount: longTasks.length,
      maximumLongTaskMs: Math.max(0, ...longTasks),
    },
    deliveryStatus: 'pending',
  };

  const reports = [...currentReports(), digest].slice(-REPORT_LIMIT);
  memoryReports = reports;
  writeJson(REPORTS_KEY, reports);
  return digest;
}

function maybeCreateFridayDigest(now = new Date()): void {
  if (now.getDay() !== 5) return;
  const weekEnding = localDateKey(now);
  const last = readDiagnosticDigests()[0];
  if (last?.weekEnding === weekEnding) return;
  const digest = createDiagnosticDigest(now.getTime());
  void deliverDiagnosticDigest(digest);
}

function persistDigest(digest: DiagnosticDigest): void {
  const reports = currentReports().map((report) => (report.id === digest.id ? digest : report));
  memoryReports = reports;
  writeJson(REPORTS_KEY, reports);
}

function reportEndpoint(): string | null {
  if (!diagnosticsReportEndpoint) return null;
  try {
    const endpoint = new URL(diagnosticsReportEndpoint);
    if (endpoint.protocol === 'https:' || endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1') {
      return endpoint.toString();
    }
  } catch {
    return null;
  }
  return null;
}

/** Sends counts only; event messages, stacks, reading history, and identifiers stay local. */
export async function deliverDiagnosticDigest(digest: DiagnosticDigest): Promise<UserHealthCheckResult> {
  const endpoint = reportEndpoint();
  if (!endpoint) {
    const result = { hasIssue: digest.totalEvents > 0, reportSent: false, failureReason: 'not-configured' as const };
    persistDigest({ ...digest, deliveryStatus: 'not-configured' });
    return result;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        schemaVersion: 1,
        reportType: 'weekly-health',
        weekEnding: digest.weekEnding,
        totalEvents: digest.totalEvents,
        counts: digest.counts,
        performance: digest.performance,
      }),
    });
    const result: UserHealthCheckResult = response.ok
      ? { hasIssue: digest.totalEvents > 0, reportSent: true }
      : { hasIssue: digest.totalEvents > 0, reportSent: false, failureReason: 'server' };
    persistDigest({ ...digest, deliveryStatus: response.ok ? 'sent' : 'failed' });
    return result;
  } catch {
    persistDigest({ ...digest, deliveryStatus: 'failed' });
    return { hasIssue: digest.totalEvents > 0, reportSent: false, failureReason: 'network' };
  } finally {
    window.clearTimeout(timeout);
  }
}

/** Checks browser storage and recent captured events, then attempts a counts-only report. */
export async function runUserHealthCheck(): Promise<UserHealthCheckResult> {
  let storageAvailable = false;
  let databaseAvailable = false;
  try {
    const probeKey = 'furqan:diagnostics:probe';
    localStorage.setItem(probeKey, 'ok');
    storageAvailable = localStorage.getItem(probeKey) === 'ok';
    localStorage.removeItem(probeKey);
  } catch {
    storageAvailable = false;
  }

  try {
    if (typeof indexedDB !== 'undefined') {
      databaseAvailable = await new Promise<boolean>((resolve) => {
        const request = indexedDB.open('furqan-db');
        request.onsuccess = () => {
          const database = request.result;
          const hasKeyValueStore = database.objectStoreNames.contains('kv');
          database.close();
          resolve(hasKeyValueStore);
        };
        request.onerror = () => resolve(false);
      });
    }
  } catch {
    databaseAvailable = false;
  }

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentEvents = currentEvents().filter((event) => event.at >= cutoff);
  if (!storageAvailable) recordDiagnostic('unhandled-error', 'Local storage health check failed');
  if (!databaseAvailable) recordDiagnostic('unhandled-error', 'Offline database health check failed');
  const digest = createDiagnosticDigest();
  const result = await deliverDiagnosticDigest(digest);
  return {
    ...result,
    hasIssue: result.hasIssue || !storageAvailable || !databaseAvailable || recentEvents.length > 0,
  };
}

export function clearDiagnostics(): boolean {
  memoryEvents = [];
  memoryReports = [];
  let cleared = true;
  for (const key of [EVENTS_KEY, REPORTS_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      cleared = false;
    }
  }
  return cleared;
}

/** Install local-only crash, rejected-promise, audio and long-task capture. */
export function startDiagnosticCapture(): () => void {
  if (captureStarted || typeof window === 'undefined') return () => undefined;
  captureStarted = true;

  const onError = (event: ErrorEvent) => {
    recordDiagnostic('unhandled-error', 'Unhandled browser error', event.error?.stack ?? '');
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const error = reason instanceof Error ? reason : null;
    recordDiagnostic(
      'unhandled-rejection',
      'Unhandled promise rejection',
      error?.stack ?? '',
    );
  };
  const onVisibility = () => maybeCreateFridayDigest();
  const interval = window.setInterval(() => maybeCreateFridayDigest(), 60_000);

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  window.addEventListener('focus', onVisibility);
  document.addEventListener('visibilitychange', onVisibility);
  maybeCreateFridayDigest();

  let observer: PerformanceObserver | null = null;
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= 2500) {
            recordDiagnostic('performance', 'Main-thread task exceeded 2.5 seconds', '', entry.duration);
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      observer = null;
    }
  }

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    window.removeEventListener('focus', onVisibility);
    document.removeEventListener('visibilitychange', onVisibility);
    observer?.disconnect();
    captureStarted = false;
  };
}
