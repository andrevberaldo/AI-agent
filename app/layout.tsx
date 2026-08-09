import type { Metadata } from 'next';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import '@copilotkit/react-ui/styles.css';
import { CopilotKit } from '@copilotkit/react-core';

export const metadata: Metadata = {
  title: 'AI Agent',
  description: 'Fullstack AI Agent with Copilot Kit',
};

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
        <CopilotKit publicApiKey="test-key">
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </CopilotKit>
      </body>
    </html>
  );
}
