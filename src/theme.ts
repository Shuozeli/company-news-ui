import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'harbor',
  primaryShade: 7,
  autoContrast: true,
  cursorType: 'pointer',
  defaultRadius: 'md',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
    fontWeight: '600',
    textWrap: 'balance',
  },
  colors: {
    harbor: [
      '#eef6f5',
      '#d9e8e6',
      '#b1d0cc',
      '#86b5b0',
      '#629e98',
      '#4b8f88',
      '#3e827c',
      '#2e6e69',
      '#205b56',
      '#104a46',
    ],
    ember: [
      '#fff1ec',
      '#ffe0d5',
      '#f8bfaf',
      '#f09b85',
      '#ea7d62',
      '#e76a4d',
      '#d85a3c',
      '#bd4930',
      '#a83e29',
      '#94321f',
    ],
  },
});
