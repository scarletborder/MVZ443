import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { SettingsProvider } from './context/settings_ctx.tsx';
import { SaveProvider } from './context/save_ctx.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <SaveProvider>
        <App />
      </SaveProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
