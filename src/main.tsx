import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { store } from './store';
import { player } from './audio/controller';
import App from './App';
import './index.css';

// Register the service worker (auto-updating). No-op during `vite dev`.
try {
  registerSW({ immediate: true });
} catch {
  /* SW not available in dev – ignore */
}

// Initialise the audio controller + media session (no audio starts here).
player.initialize();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
