import { useEffect } from 'react';
import { useAppSelector } from '../../store';
import { accentHex } from '../../lib/constants';

/** Applies the active theme (data-mode / data-accent + theme-color) to <html>. */
export function ThemeManager() {
  const mode = useAppSelector((s) => s.theme.mode);
  const accent = useAppSelector((s) => s.theme.accent);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const prefersDark = mq.matches;
      // Velvet is a dark-family progression theme; Golden is a light one.
      const dark = mode === 'dark' || mode === 'velvet' || (mode === 'system' && prefersDark);
      const root = document.documentElement;
      const isExplicit = mode === 'sepia' || mode === 'velvet' || mode === 'golden';
      root.dataset.mode = isExplicit ? mode : dark ? 'dark' : 'light';
      root.dataset.accent = accent;
      root.style.colorScheme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', accentHex(accent, dark));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode, accent]);

  return null;
}
