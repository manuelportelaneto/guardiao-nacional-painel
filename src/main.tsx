import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/react-query'
console.log('Main.tsx is executing');
import './index.css'
import App from './App.tsx'

import ErrorBoundary from './components/ErrorBoundary';
import { PreLaunchGate } from './components/PreLaunchGate';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <PreLaunchGate>
          <App />
        </PreLaunchGate>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
