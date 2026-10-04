export const Colors = {
  // Base Surfaces
  surface: '#f8f9ff',
  surfaceLowest: '#ffffff',
  surfaceLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceHigh: '#dce9ff',
  surfaceHighest: '#d3e4fe',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',

  // Foreground & Typography
  onSurface: '#0b1c30',
  onSurfaceVariant: '#434655',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',

  // Brand Primary (Actions & Active state)
  primary: '#004ac6',
  primaryContainer: '#2563eb',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#eeefff',
  primaryFixed: '#dbe1ff',
  primaryFixedDim: '#b4c5ff',

  // Operational / Secure / Armed (Green)
  secondary: '#006e2d',
  secondaryActive: '#16a34a',
  secondaryContainer: '#7cf994',
  secondaryContainerLight: '#dcfce7',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#007230',

  // Intrusion / Danger / Threat (Red)
  tertiary: '#ae0010',
  tertiaryActive: '#dc2626',
  tertiaryContainer: '#d52022',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#ffecea',

  // Errors / Badges
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  errorContainerLight: '#fee2e2',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // Borders & Dividers
  outline: '#737686',
  outlineVariant: '#c3c6d7',
  border: '#e2e8f0',
  divider: '#f1f5f9',

  // Dark stream hud & overlays
  hudOverlay: 'rgba(33, 49, 69, 0.85)',
  hudPill: 'rgba(11, 28, 48, 0.85)',
  hudText: '#ffffff',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 16,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
};
