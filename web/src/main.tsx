import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support for the rink: the service worker keeps the app shell on the phone.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      const urls = [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[rel="stylesheet"], link[rel="modulepreload"]')]
        .map((el) => ('src' in el ? el.src : el.href))
        .filter(Boolean);
      reg.active?.postMessage({ type: 'cache-urls', urls });
    } catch {
      // Without a service worker the app still works online.
    }
  });
}
