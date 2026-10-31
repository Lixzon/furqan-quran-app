import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { player } from '../audio/controller';
import { useAppDispatch } from '../store';
import { push } from '../store/slices/toastSlice';
import { deepLinkFromSearch, parseDeepLink } from '../lib/deepLink';

/**
 * Routes incoming `furkan://` links (native shell, sibling apps, or the
 * `web+furkan` protocol handler) into the app. Loop links start playing the
 * requested window immediately; everything else is a plain navigation.
 */
export function DeepLinkHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const hash = location.hash.startsWith('#furkan://') ? location.hash.slice(1) : null;
    const raw = deepLinkFromSearch(location.search) ?? hash;
    if (!raw) return;

    const action = parseDeepLink(raw);
    if (!action) {
      dispatch(push('That Furqan link could not be opened.', 'info'));
      return;
    }

    if (action.kind === 'loop') {
      void player.playRange(action.surah, action.start - 1, action.end - 1);
      navigate(`/surah/${action.surah}?ayah=${action.start}`, { replace: true });
      dispatch(
        push(
          action.start === action.end
            ? `Looping ayah ${action.start}.`
            : `Looping ayat ${action.start}–${action.end}.`,
          'info',
        ),
      );
      return;
    }

    navigate(action.to, { replace: true });
  }, [location.search, location.hash, navigate, dispatch]);

  return null;
}
