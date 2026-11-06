import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import { player } from './audio/controller';
import { startDiagnosticCapture } from './services/diagnostics';
import App from './App';
import './index.css';

startDiagnosticCapture();

if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
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
