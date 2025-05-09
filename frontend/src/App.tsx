import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Box from '@mui/material/Box';
import JiraStoryForm from './components/JiraStoryForm';

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          background: 'linear-gradient(135deg, #7b2ff2 0%, #f357a8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <JiraStoryForm />
      </Box>
    </ThemeProvider>
  );
}

export default App;
