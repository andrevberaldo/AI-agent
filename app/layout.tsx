'use client';

import type { Metadata } from 'next';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import '@copilotkit/react-ui/styles.css';
import { CopilotKit } from '@copilotkit/react-core';

// Metadata is handled at a higher level for client-side rendered layout

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </CopilotKit>
      </body>
    </html>
  );
}
