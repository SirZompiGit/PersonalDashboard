import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './hooks/useToasts';
import { ToastViewport } from './components/ui/ToastViewport';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root non trovato in index.html');

createRoot(container).render(
  <StrictMode>
    {/* Senza questa protezione qualunque errore di render lasciava schermo bianco. */}
    <ErrorBoundary>
      <ToastProvider>
        <App />
        <ToastViewport />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
