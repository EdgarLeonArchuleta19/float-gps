import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Fallback: si iOS/celular carga la página ya desplazada (arriba cortado),
// se recarga una sola vez tras la carga para que inicie desde arriba.
const navEntry = (performance.getEntriesByType?.('navigation') as any)?.[0];
const entryType: string = navEntry?.type || 'navigate';
if (entryType === 'navigate' && !sessionStorage.getItem('floa-first-entry-fixed')) {
  const onLoad = () => {
    window.removeEventListener('load', onLoad);
    setTimeout(() => {
      if (window.scrollY > 20) {
        sessionStorage.setItem('floa-first-entry-fixed', '1');
        window.location.reload();
      }
    }, 400);
  };
  window.addEventListener('load', onLoad);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
