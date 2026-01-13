import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
console.log('Main.tsx is executing');
import './index.css'
import App from './App.tsx'

import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
