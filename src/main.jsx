import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { VoiceProvider } from './context/VoiceContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Rejestracja Service Workera dla aplikacji mobilnej PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <VoiceProvider>
            <App />
          </VoiceProvider>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

