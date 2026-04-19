import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { SettingsProvider } from './context/settings_ctx.tsx';
import { SaveProvider } from './context/save_ctx.tsx';
import { MonsterLibrary } from './game/managers/library/MonsterLibrary.ts';
import { PlantLibrary } from './game/managers/library/PlantLibrary.ts';

// load library
PlantLibrary.Initialize();
MonsterLibrary.Initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <SaveProvider>
        <App />
      </SaveProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
