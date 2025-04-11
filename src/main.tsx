import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { SettingsProvider } from './context/settings_ctx.tsx';
import { SaveProvider } from './context/save_ctx.tsx';
import { GameProvider } from './context/garden_ctx.tsx';
import { LoadWasm } from './utils/wasmLoader/loadWasm.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <LoadWasm>
            <SettingsProvider>
                <SaveProvider>
                    <GameProvider>
                        <App />
                    </GameProvider>
                </SaveProvider>
            </SettingsProvider>
        </LoadWasm>
    </React.StrictMode>,
)
