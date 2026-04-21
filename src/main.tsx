import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme, localStorageColorSchemeManager } from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';

const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace:
    '"SF Mono", "JetBrains Mono", "Cascadia Code", ui-monospace, monospace',
  defaultRadius: 'md',
});

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'spaceforge:color-scheme',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider
      theme={theme}
      defaultColorScheme="dark"
      colorSchemeManager={colorSchemeManager}
    >
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
