import { store } from '../store';
import { RECITERS, audioStreamUrl } from '../lib/constants';
import { db } from '../db/database';
import { recordDiagnostic } from './diagnostics';

export type AuditSeverity = 'error' | 'warning' | 'info';
export type AuditStatus = 'passed' | 'failed' | 'warning' | 'not-applicable';

export interface AuditCheck {
  id: string;
  status: AuditStatus;
  severity: AuditSeverity;
  message: string;
  details?: Record<string, string | number | boolean>;
}

export interface AuditReport {
  schemaVersion: 1;
  app: 'furqan';
  scan: 'light' | 'heavy';
  trigger: 'manual' | 'scheduled';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  summary: { passed: number; failed: number; warnings: number; notApplicable: number };
  checks: AuditCheck[];
}

const STATE_KEYS = [
  'theme',
  'settings',
  'playlists',
  'progress',
  'likes',
  'bookmarks',
  'memorized',
] as const;
const HEAVY_SCAN_INTERVAL = 7 * 24 * 60 * 60 * 1000;
const LAST_HEAVY_SCAN_KEY = 'furqan:audit:last-heavy:v1';

function check(
  id: string,
  status: AuditStatus,
  severity: AuditSeverity,
  message: string,
  details?: AuditCheck['details'],
): AuditCheck {
  return { id, status, severity, message, ...(details ? { details } : {}) };
}

function makeReport(
  scan: AuditReport['scan'],
  trigger: AuditReport['trigger'],
  started: number,
  checks: AuditCheck[],
): AuditReport {
  const summary = {
    passed: checks.filter((item) => item.status === 'passed').length,
    failed: checks.filter((item) => item.status === 'failed').length,
    warnings: checks.filter((item) => item.status === 'warning').length,
    notApplicable: checks.filter((item) => item.status === 'not-applicable').length,
  };
  return {
    schemaVersion: 1,
    app: 'furqan',
    scan,
    trigger,
    startedAt: new Date(started).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Math.max(0, Date.now() - started),
    summary,
    checks,
  };
}

async function checkResponsiveness(): Promise<AuditCheck> {
  const started = performance.now();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const frameDelayMs = Math.round(performance.now() - started);
  const main = document.querySelector('main');
  const interactiveCount = document.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled)').length;
  if (!main || interactiveCount === 0) {
    return check('ui-responsive', 'failed', 'error', 'The main view or interactive controls are missing.', {
      hasMain: Boolean(main),
      interactiveCount,
    });
  }
  if (frameDelayMs > 250) {
    return check('ui-responsive', 'warning', 'warning', 'The first animation frame was delayed.', {
      frameDelayMs,
      interactiveCount,
    });
  }
  return check('ui-responsive', 'passed', 'info', 'The main view rendered and interactive controls are available.', {
    frameDelayMs,
    interactiveCount,
  });
}

function checkViewport(): AuditCheck {
  const root = document.documentElement;
  const horizontalOverflow = root.scrollWidth > root.clientWidth + 1;
  return check(
    'viewport-bounds',
    horizontalOverflow ? 'warning' : 'passed',
    horizontalOverflow ? 'warning' : 'info',
    horizontalOverflow ? 'The page is wider than the viewport.' : 'The page fits the current viewport width.',
    { viewportWidth: root.clientWidth, contentWidth: root.scrollWidth, viewportHeight: window.innerHeight },
  );
}

function checkLocalStorage(): AuditCheck {
  const malformed: string[] = [];
  let accessible = false;
  try {
    const probe = 'furqan:audit:probe';
    localStorage.setItem(probe, 'ok');
    accessible = localStorage.getItem(probe) === 'ok';
    localStorage.removeItem(probe);
    for (const key of STATE_KEYS) {
      const raw = localStorage.getItem(`furqan:${key}`);
      if (raw !== null) {
        try {
          JSON.parse(raw);
        } catch {
          malformed.push(key);
        }
      }
    }
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith('furqan:reminder:')) continue;
      const value = localStorage.getItem(key);
      if (value !== '1') malformed.push(key);
    }
  } catch {
    accessible = false;
  }

  const hasIssues = !accessible || malformed.length > 0;
  return check(
    'local-storage-integrity',
    hasIssues ? 'warning' : 'passed',
    hasIssues ? 'warning' : 'info',
    hasIssues ? 'Local storage is unavailable or contains malformed app data.' : 'App state and reminder flags are readable.',
    { accessible, malformedKeys: malformed.length },
  );
}

function checkThemeAssets(): AuditCheck {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const accent = style.getPropertyValue('--q-accent').trim();
  const onAccent = style.getPropertyValue('--q-on-accent').trim();
  const mode = root.dataset.mode ?? '';
  const valid = Boolean(accent && onAccent && mode);
  const fontsReady = document.fonts?.status === 'loaded';
  return check(
    'theme-assets',
    valid ? 'passed' : 'warning',
    valid ? 'info' : 'warning',
    valid ? 'Theme mode and accent tokens are loaded.' : 'One or more theme tokens are missing.',
    { mode: mode || 'missing', accentLoaded: Boolean(accent), onAccentLoaded: Boolean(onAccent), fontsReady },
  );
}

export async function runLightScan(trigger: AuditReport['trigger'] = 'manual'): Promise<AuditReport> {
  const started = Date.now();
  const checks = [checkViewport(), checkLocalStorage(), checkThemeAssets(), await checkResponsiveness()];
  return makeReport('light', trigger, started, checks);
}

async function checkIndexedDb(): Promise<AuditCheck> {
  try {
    await db.open();
    const keys = await db.kv.toCollection().primaryKeys();
    const expected = STATE_KEYS.filter((key) => keys.includes(key));
    const missing = STATE_KEYS.filter((key) => !keys.includes(key));
    const status: AuditStatus = missing.length ? 'warning' : 'passed';
    const severity: AuditSeverity = missing.length ? 'warning' : 'info';
    return check(
      'indexeddb-slices',
      status,
      severity,
      missing.length ? 'Some persisted slices are absent from IndexedDB.' : 'Persisted app slices are available in IndexedDB.',
      { expectedSlices: STATE_KEYS.length, presentSlices: expected.length, missingSlices: missing.length },
    );
  } catch (error) {
    recordDiagnostic('unhandled-error', 'Heavy audit could not read IndexedDB', error instanceof Error ? error.stack ?? '' : '');
    return check('indexeddb-integrity', 'failed', 'error', 'The offline database could not be read.');
  }
}

function checkAppState(): AuditCheck {
  const state = store.getState();
  try {
    const serialized = JSON.stringify(state);
    if (!serialized) throw new Error('Empty application state');
    const parsed: unknown = JSON.parse(serialized);
    const sliceCount = Object.keys(parsed as Record<string, unknown>).length;
    return check('application-state', 'passed', 'info', 'The complete Furqan Redux state is serializable.', {
      sliceCount,
      serializedBytes: new Blob([serialized]).size,
    });
  } catch {
    return check('application-state', 'failed', 'error', 'The application state could not be serialized.');
  }
}

function checkAudioRoutes(): AuditCheck {
  let total = 0;
  let invalid = 0;
  for (const reciter of RECITERS) {
    for (let surah = 1; surah <= 114; surah += 1) {
      total += 1;
      try {
        const url = new URL(audioStreamUrl(reciter.id, surah), window.location.origin);
        if (url.protocol !== 'https:' && url.origin !== window.location.origin) invalid += 1;
      } catch {
        invalid += 1;
      }
    }
  }
  const status = invalid ? 'failed' : 'passed';
  return check(
    'reciter-audio-routes',
    status,
    invalid ? 'error' : 'info',
    invalid ? 'One or more reciter audio routes are malformed.' : 'All configured reciter/surah audio routes are structurally valid.',
    { reciters: RECITERS.length, surahs: 114, routesChecked: total, invalidRoutes: invalid, networkRequestsMade: 0 },
  );
}

export async function runHeavyScan(trigger: AuditReport['trigger'] = 'manual'): Promise<AuditReport> {
  if (!import.meta.env.DEV) throw new Error('Heavy scans are only available in developer builds.');
  const started = Date.now();
  const light = await runLightScan(trigger);
  const checks = [
    ...light.checks,
    checkAppState(),
    await checkIndexedDb(),
    checkAudioRoutes(),
    check(
      'prayer-calculation-datasets',
      'not-applicable',
      'info',
      'No prayer calculation engine or prayer timetable dataset exists in this Furqan repository.',
    ),
    check(
      'cross-app-mishkah',
      'not-applicable',
      'info',
      'Mishkah source is not present in this workspace and was not scanned.',
    ),
  ];
  const report = makeReport('heavy', trigger, started, checks);
  try {
    localStorage.setItem(LAST_HEAVY_SCAN_KEY, String(Date.now()));
  } catch (error) {
    recordDiagnostic('unhandled-error', 'Heavy audit could not save its schedule state', error instanceof Error ? error.stack ?? '' : '');
  }
  return report;
}

export function isHeavyScanDue(now = Date.now()): boolean {
  try {
    const last = Number(localStorage.getItem(LAST_HEAVY_SCAN_KEY));
    return !Number.isFinite(last) || last <= 0 || now - last >= HEAVY_SCAN_INTERVAL;
  } catch {
    return true;
  }
}
