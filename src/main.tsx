import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

import App from './App';
import './index.css';

const theme = createTheme({
  fontFamily:
    "'HarmonyOS Sans SC', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  headings: {
    fontFamily:
      "'Source Han Sans SC', 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontWeight: '700',
  },
  primaryColor: 'teal',
  defaultRadius: 'md',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
