import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
  type MantineColorsTuple,
} from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';

// Neon lime — very bright, used for primary accents.
const neon: MantineColorsTuple = [
  '#f6ffd6',
  '#ecff9e',
  '#dcff55',
  '#ccff00',
  '#c2f300',
  '#b9e600',
  '#a8d200',
  '#8fb600',
  '#759300',
  '#566c00',
];

const theme = createTheme({
  primaryColor: 'neon',
  primaryShade: { light: 5, dark: 3 },
  colors: { neon },
  // Neon lime is bright enough that white text on filled buttons is
  // unreadable. autoContrast picks a dark label when the background is
  // light and a light label when the background is dark, across every
  // Mantine component that uses the primary color (Button, Badge, etc).
  autoContrast: true,
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
