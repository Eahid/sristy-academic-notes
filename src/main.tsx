// Safe-guard window.fetch to prevent "Cannot set property fetch of #<Window> which has only a getter"
// in restricted sandboxed iframe preview environments.
if (typeof window !== 'undefined') {
  try {
    let currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return currentFetch;
      },
      set(val) {
        currentFetch = val;
      },
      configurable: true,
      enumerable: true
    });
  } catch (err) {
    try {
      const proto = Object.getPrototypeOf(window);
      if (proto) {
        let currentFetch = window.fetch;
        Object.defineProperty(proto, 'fetch', {
          get() {
            return currentFetch;
          },
          set(val) {
            currentFetch = val;
          },
          configurable: true,
          enumerable: true
        });
      }
    } catch (e2) {
      console.warn('Could not make window.fetch configurable/writable:', e2);
    }
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeLanguageProvider } from './components/ThemeLanguageContext.tsx';
import { BranchSubjectProvider } from './components/BranchSubjectContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeLanguageProvider>
      <BranchSubjectProvider>
        <App />
      </BranchSubjectProvider>
    </ThemeLanguageProvider>
  </StrictMode>,
);
