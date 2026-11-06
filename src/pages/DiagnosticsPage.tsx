import { useState } from 'react';
import { PageHeader } from '../components/ui/common';
import { copyText } from '../lib/share';
import {
  clearDiagnostics,
  createDiagnosticDigest,
  deliverDiagnosticDigest,
  readDiagnosticDigests,
  readDiagnosticEvents,
  recordDiagnostic,
  runUserHealthCheck,
  type DiagnosticDigest,
  type DiagnosticEvent,
  type UserHealthCheckResult,
} from '../services/diagnostics';
import { isHeavyScanDue, runHeavyScan, runLightScan, type AuditReport } from '../services/auditEngine';

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

export default function DiagnosticsPage() {
  const [checking, setChecking] = useState(false);
  const [auditChecking, setAuditChecking] = useState(false);
  const [result, setResult] = useState<UserHealthCheckResult | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [events, setEvents] = useState<DiagnosticEvent[]>(() => readDiagnosticEvents());
  const [digests, setDigests] = useState<DiagnosticDigest[]>(() => readDiagnosticDigests());
  const [devMessage, setDevMessage] = useState('');
  const latestDigest = digests[0];
  const developerMode = import.meta.env.DEV;
  const healthMessage = !result
    ? ''
    : result.hasIssue
      ? result.reportSent
        ? 'An issue was detected and a diagnostic report has been sent to the developers. Resolution coming soon.'
        : result.failureReason === 'not-configured'
          ? 'An issue was detected, but report delivery is not configured. A privacy-minimized diagnostic summary remains on this device.'
          : 'An issue was detected, but the diagnostic report could not be sent. Please try again later.'
      : 'No issues were detected. Your report stays on this device unless a configured diagnostics service is available.';

  const runCheck = async () => {
    setChecking(true);
    setResult(null);
    try {
      setResult(await runUserHealthCheck());
      setEvents(readDiagnosticEvents());
      setDigests(readDiagnosticDigests());
    } catch (error) {
      recordDiagnostic('unhandled-error', 'User health check failed', error instanceof Error ? error.stack ?? '' : '');
      setResult({ hasIssue: true, reportSent: false, failureReason: 'network' });
    } finally {
      setChecking(false);
    }
  };

  const refreshDeveloperData = () => {
    setEvents(readDiagnosticEvents());
    setDigests(readDiagnosticDigests());
  };

  const createAndSendDigest = async () => {
    const digest = createDiagnosticDigest();
    await deliverDiagnosticDigest(digest);
    refreshDeveloperData();
  };

  const copyVerifyCommand = async () => {
    const copied = await copyText('npm run verify');
    setDevMessage(copied ? 'Command copied.' : 'Could not copy the command.');
  };

  const clearDeveloperData = () => {
    if (!window.confirm('Delete locally stored diagnostic events and reports from this device?')) return;
    clearDiagnostics();
    refreshDeveloperData();
  };

  const runAuditScan = async (scan: 'light' | 'heavy') => {
    setAuditChecking(true);
    try {
      const report = scan === 'heavy' ? await runHeavyScan('manual') : await runLightScan('manual');
      setAuditReport(report);
      setDevMessage(scan === 'heavy' ? 'Heavy audit completed.' : 'Light audit completed.');
    } catch (error) {
      recordDiagnostic('unhandled-error', 'App audit scan failed', error instanceof Error ? error.stack ?? '' : '');
      setDevMessage('The audit scan could not complete in this environment.');
    } finally {
      setAuditChecking(false);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="App health"
        subtitle="A private check of Furqan’s local storage and recent stability."
      />

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">In-app health check</h2>
        <p className="mt-1 text-sm leading-relaxed text-mut">
          Checks that this device can use local storage and the offline database. Diagnostic reports contain only anonymous event counts.
        </p>
        <button
          type="button"
          onClick={() => void runCheck()}
          disabled={checking}
          className="mt-4 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Run health check'}
        </button>
        {result && (
          <p role="status" className={`mt-3 text-sm leading-relaxed ${result.hasIssue ? 'text-danger' : 'text-ink'}`}>
            {healthMessage}
          </p>
        )}
      </section>

      {developerMode && (
        <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Developer diagnostics</h2>
              <p className="mt-1 text-xs leading-relaxed text-mut">
                Development-only tools. Stored traces are scrubbed before they are retained.
              </p>
            </div>
            <button type="button" onClick={refreshDeveloperData} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink pressable">
              Refresh
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyVerifyCommand()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink pressable">
              Copy npm run verify
            </button>
            <button type="button" onClick={() => void runAuditScan('light')} disabled={auditChecking} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink pressable disabled:opacity-50">
              {auditChecking ? 'Running light audit…' : 'Run light audit'}
            </button>
            <button type="button" onClick={() => void runAuditScan('heavy')} disabled={auditChecking || !developerMode || !isHeavyScanDue()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink pressable disabled:opacity-50">
              {auditChecking ? 'Running heavy audit…' : 'Run heavy audit'}
            </button>
            <button type="button" onClick={() => void createAndSendDigest()} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-ink pressable">
              Create and send weekly digest
            </button>
            <button type="button" onClick={clearDeveloperData} className="rounded-full border border-line px-3 py-2 text-xs font-medium text-danger pressable">
              Clear local diagnostics
            </button>
          </div>
          {devMessage && <p role="status" className="mt-2 text-xs text-mut">{devMessage}</p>}

          {auditReport && (
            <div className="mt-4 rounded-xl bg-surface2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-ink">{auditReport.scan.toUpperCase()} audit · {auditReport.trigger}</h3>
                <span className="text-[10px] uppercase tracking-wide text-mut">{auditReport.durationMs} ms</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-mut sm:grid-cols-4">
                <span>Passed: {auditReport.summary.passed}</span>
                <span>Failed: {auditReport.summary.failed}</span>
                <span>Warnings: {auditReport.summary.warnings}</span>
                <span>Not applicable: {auditReport.summary.notApplicable}</span>
              </div>
              <div className="mt-3 space-y-2">
                {auditReport.checks.map((check) => (
                  <div key={check.id} className="rounded-lg border border-line bg-surface px-2 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">{check.id}</span>
                      <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-mut">{check.status}</span>
                    </div>
                    <p className="mt-1 text-mut">{check.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {latestDigest && (
            <div className="mt-4 rounded-xl bg-surface2 p-3">
              <h3 className="text-xs font-semibold text-ink">Latest weekly digest · {latestDigest.weekEnding}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-mut sm:grid-cols-3">
                {Object.entries(latestDigest.counts).map(([kind, count]) => (
                  <span key={kind}>{kind}: {count}</span>
                ))}
                <span>Long tasks: {latestDigest.performance.longTaskCount}</span>
                <span>Maximum long task: {latestDigest.performance.maximumLongTaskMs} ms</span>
                <span>Delivery: {latestDigest.deliveryStatus ?? 'local only'}</span>
              </div>
            </div>
          )}

          <h3 className="mt-4 text-xs font-semibold text-ink">Recent local traces · {events.length}</h3>
          {events.length ? (
            <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
              {events.slice(0, 20).map((event) => (
                <article key={event.id} className="rounded-xl bg-surface2 px-3 py-2">
                  <div className="flex flex-wrap justify-between gap-x-3 text-xs">
                    <span className="font-medium text-ink">{event.kind}</span>
                    <time className="text-mut">{formatTime(event.at)}</time>
                  </div>
                  <p className="mt-1 break-words text-xs text-mut">{event.message}</p>
                  {event.stack && <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] text-mut">{event.stack}</pre>}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-mut">No diagnostic traces captured.</p>
          )}
        </section>
      )}
    </div>
  );
}
