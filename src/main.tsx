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
