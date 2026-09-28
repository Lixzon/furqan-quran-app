import { useEffect } from 'react';
import { useAppSelector } from '../../store';
import { accentHex } from '../../lib/constants';
import { customAccentVars } from '../../lib/customTheme';
import { isAiUiUnlocked } from '../../lib/unlocks';
import type { ThemeMode } from '../../types';

/** Themes built on a dark palette, so `color-scheme` and on-accent ink follow. */
const DARK_MODES: ThemeMode[] = ['dark', 'velvet', 'midnight'];

/** Themes that carry their own palette instead of resolving through light/dark. */
const EXPLICIT_MODES: ThemeMode[] = ['sepia', 'midnight', 'emerald', 'velvet', 'golden'];

/** Applies the active theme (data-mode / data-accent + theme-color) to <html>. */
export function ThemeManager() {
  const mode = useAppSelector((s) => s.theme.mode);
  const accent = useAppSelector((s) => s.theme.accent);
  const customAccent = useAppSelector((s) => s.theme.customAccent);
  const assistantLayout = useAppSelector((s) => s.settings.assistantLayout);
  const streak = useAppSelector((s) => s.progress.progression.currentStreak);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const prefersDark = mq.matches;
      // Velvet and Midnight Blue are dark-family themes; Golden is a light one.
      const dark = DARK_MODES.includes(mode) || (mode === 'system' && prefersDark);
      const root = document.documentElement;
      root.dataset.mode = EXPLICIT_MODES.includes(mode) ? mode : dark ? 'dark' : 'light';
      root.dataset.accent = accent;

      // The 365-day Istiqamah milestone gates the advanced UI. While it is not
      // held, the custom accent is dropped and the layout falls back to classic,
      // so a choice made while unlocked is never applied out of gate.
      const aiUnlocked = isAiUiUnlocked(streak);
      root.dataset.assistantLayout = aiUnlocked ? assistantLayout : 'classic';

      const custom = aiUnlocked && customAccent ? customAccentVars(customAccent) : null;
      if (custom) {
        // Inline custom properties outrank the [data-accent] palette rules,
        // which is exactly what a reader-built accent needs.
        root.style.setProperty('--q-accent', custom.accent);
        root.style.setProperty('--q-accent-strong', custom.strong);
        root.style.setProperty('--q-on-accent', custom.on);
      } else {
        root.style.removeProperty('--q-accent');
        root.style.removeProperty('--q-accent-strong');
        root.style.removeProperty('--q-on-accent');
      }

      root.style.colorScheme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', custom?.accent ?? accentHex(accent, dark));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode, accent, customAccent, assistantLayout, streak]);

  return null;
}
