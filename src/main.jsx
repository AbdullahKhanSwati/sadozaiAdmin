import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// After a new deploy, a browser still holding the OLD page asks for script
// files that no longer exist, and the page stays blank until a manual refresh.
// Reload once by itself instead (guarded so it can never loop).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem('reloaded-for-update')) return;
    sessionStorage.setItem('reloaded-for-update', '1');
  } catch (e) { /* storage blocked — reload anyway */ }
  window.location.reload();
});
window.addEventListener('load', () => {
  setTimeout(() => { try { sessionStorage.removeItem('reloaded-for-update'); } catch (e) { /* ignore */ } }, 10000);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
