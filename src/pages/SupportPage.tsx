import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { MihrabLogo } from '../components/ui/MihrabLogo';
import { useAppDispatch } from '../store';
import { push } from '../store/slices/toastSlice';
import { copyText } from '../lib/share';
import { APP_ATTRIBUTION, APP_NAME, SUPPORT } from '../lib/constants';

export default function SupportPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyAccount = async () => {
    const ok = await copyText(SUPPORT.accountNumber);
    setCopied(ok);
    dispatch(
      ok
        ? push('Account number copied. Jazakum Allahu khairan.', 'success')
        : push('Could not copy the number. Long-press to select it.', 'error'),
    );
    if (ok) window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="page-enter mx-auto max-w-lg">
      <PageHeader
        title="Support Furqan & LIXZON"
        subtitle="Keep the Qur’an app free, ad-free and online."
        right={
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="pressable inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface2 text-mut hover:text-ink"
          >
            <Icon name="back" size={18} />
          </button>
        }
      />

      <section className="rounded-3xl border border-accent/25 bg-accent/8 p-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
          <MihrabLogo size={48} />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink2">
          {APP_NAME} is built and maintained independently by {APP_ATTRIBUTION.replace('by ', '')}.
          Your support funds Google Play developer fees, server costs and the recitation bandwidth
          that keeps every surah available.
        </p>
      </section>

      {/* local transfer */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <Icon name="heart" size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Nigerian direct transfer</h2>
            <p className="text-[11px] text-mut">Local bank transfer · {SUPPORT.currency}</p>
          </div>
        </div>

        <dl className="mt-3 space-y-2 rounded-xl bg-surface2 p-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-mut">Bank</dt>
            <dd className="text-right font-medium text-ink">{SUPPORT.bankName}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-mut">Account name</dt>
            <dd className="max-w-[62%] text-right font-medium text-ink">{SUPPORT.accountName}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-mut">Account number</dt>
            <dd className="text-right font-mono text-base font-semibold tracking-wider text-ink">
              {SUPPORT.accountNumber}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={copyAccount}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
        >
          <Icon name={copied ? 'check' : 'clipboard'} size={16} />
          {copied ? 'Account number copied' : 'Copy account number'}
        </button>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-mut">
          Transfers go directly to the developer account — no processing fee is taken by the app.
        </p>
      </section>

      {/* global */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <Icon name="cloud" size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Global support</h2>
            <p className="text-[11px] text-mut">USD card checkout · Google Play billing</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-mut">
          Cards are charged in USD and converted automatically by the payment provider. On Android,
          Google Play in-app billing mirrors the same support tiers.
        </p>

        <div className="mt-3 grid gap-2">
          {SUPPORT.checkoutUrl ? (
            <a
              href={SUPPORT.checkoutUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
            >
              <Icon name="heart" size={16} />
              Support with a card
            </a>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-surface2 px-3 py-2.5 text-center text-[11px] leading-relaxed text-mut">
              Card checkout opens with the Play Store release. Until then, the direct transfer
              above reaches the same account.
            </div>
          )}
          {SUPPORT.playStoreUrl && (
            <a
              href={SUPPORT.playStoreUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink pressable"
            >
              <Icon name="download" size={16} />
              Get Furqan on Google Play
            </a>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Where your support goes</h2>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-mut">
          <li>· Google Play Store developer registration and release fees</li>
          <li>· Audio recitation hosting and bandwidth</li>
          <li>· Server, build and maintenance costs</li>
          <li>· Keeping every feature free and free of advertising</li>
        </ul>
      </section>

      <p className="mt-6 text-center text-sm text-ink2">Jazakum Allahu khairan for carrying the light.</p>
      <p className="mt-2 text-center text-[10px] tracking-[0.22em] text-mut">{APP_ATTRIBUTION.toUpperCase()}</p>
    </div>
  );
}
