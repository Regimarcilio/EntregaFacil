'use client';

import { ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store';

export function Providers({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { preferences } = useAppStore();

  const colorScheme = preferences.tema === 'sistema' ? systemColorScheme : preferences.tema;
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}