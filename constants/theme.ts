/**
 * Theme constants for Palitana Yatra app
 * Colors inspired by the app logo - saffron orange gradient with gold accents
 * Neutrals based on Zinc scale for a modern, clean look.
 */

import { Platform } from "react-native";

// Primary saffron orange colors matching the app logo
const saffronOrange = "#F5841F"; // Main saffron orange from logo
const saffronDark = "#D96B0C"; // Darker saffron for depth
const saffronLight = "#FF9F45"; // Lighter saffron for highlights
const goldenAccent = "#D4A84B"; // Gold accent from temple illustration
const deepRed = "#991B1B"; // Spiritual red (Kumkum)

// Zinc Scale for Neutrals
const zinc = {
  50: "#FAFAFA",
  100: "#F4F4F5",
  200: "#E4E4E7",
  300: "#D4D4D8",
  400: "#A1A1AA",
  500: "#71717A",
  600: "#52525B",
  700: "#3F3F46",
  800: "#27272A",
  900: "#18181B",
  950: "#09090B",
};

export type ColorScheme = 'light' | 'dark';
export type SchemeColors = typeof Colors.light;
export type ThemeColorPalette = typeof Colors.light;

export const Colors = {
  light: {
    text: zinc[900],
    textSecondary: zinc[600],
    textTertiary: zinc[400],
    textInverse: "#FFFFFF",
    
    background: "#FFFFFF",
    backgroundSecondary: zinc[50],
    backgroundTertiary: zinc[100],
    
    tint: saffronOrange,
    tintDark: saffronDark,
    tintLight: saffronLight,
    
    // Primary Brand Colors
    primary: saffronOrange,
    primaryLight: "#FFF3E6", // Very light orange wash
    primaryDark: saffronDark,
    
    secondary: zinc[800],
    secondaryLight: zinc[200],
    
    accent: goldenAccent,
    accentLight: "#FDF6E3",
    
    icon: zinc[500],
    tabIconDefault: zinc[400],
    tabIconSelected: saffronOrange,
    
    border: zinc[200],
    borderLight: zinc[100],
    borderDark: zinc[300],
    
    card: "#FFFFFF",
    cardElevated: "#FFFFFF",
    
    success: "#10B981", // Emerald 500
    successLight: "#D1FAE5", // Emerald 100
    successDark: "#047857",
    
    warning: "#F59E0B", // Amber 500
    warningLight: "#FEF3C7", // Amber 100
    
    error: "#EF4444", // Red 500
    errorLight: "#FEE2E2", // Red 100
    
    info: "#3B82F6", // Blue 500
    infoLight: "#DBEAFE", // Blue 100
    
    // Gradient colors for headers (matching logo gradient)
    gradientStart: "#F5841F", // Saffron orange
    gradientEnd: "#FFAB40", // Golden orange
    gradientPrimaryStart: "#F5841F",
    gradientPrimaryEnd: "#FFAB40",
    
    // Glass effect colors
    glass: "rgba(255, 255, 255, 0.7)",
    glassOverlay: "rgba(255, 255, 255, 0.4)",
    glassBorder: "rgba(255, 255, 255, 0.5)",
    
    // Status colors
    completed: "#10B981",
    completedLight: "#D1FAE5",
    inProgress: saffronOrange,
    inProgressLight: "#FFF3E6",
    notStarted: zinc[400],
    notStartedLight: zinc[100],
    
    // Spiritual Accents
    kumkum: deepRed,
    gold: goldenAccent,
  },
  dark: {
    text: zinc[50],
    textSecondary: zinc[400],
    textTertiary: zinc[600],
    textInverse: zinc[900],
    
    background: zinc[950],
    backgroundSecondary: zinc[900],
    backgroundTertiary: zinc[800],
    
    tint: saffronLight,
    tintDark: saffronOrange,
    tintLight: "#FFB366",
    
    // Primary Brand Colors
    primary: saffronLight,
    primaryLight: "#3D2A1A",
    primaryDark: saffronDark,
    
    secondary: zinc[200],
    secondaryLight: zinc[800],
    
    accent: goldenAccent,
    accentLight: "#3D3520",
    
    icon: zinc[400],
    tabIconDefault: zinc[600],
    tabIconSelected: saffronLight,
    
    border: zinc[800],
    borderLight: zinc[900],
    borderDark: zinc[700],
    
    card: zinc[900],
    cardElevated: zinc[800],
    
    success: "#34D399", // Emerald 400
    successLight: "#064E3B", // Emerald 900
    successDark: "#022C22",
    
    warning: "#FBBF24", // Amber 400
    warningLight: "#78350F", // Amber 900
    
    error: "#F87171", // Red 400
    errorLight: "#7F1D1D", // Red 900
    
    info: "#60A5FA", // Blue 400
    infoLight: "#1E3A5F", // Blue 900
    
    // Gradient colors for headers
    gradientStart: "#D96B0C",
    gradientEnd: "#F5841F",
    gradientPrimaryStart: "#D96B0C",
    gradientPrimaryEnd: "#F5841F",
    
    // Glass effect colors
    glass: "rgba(24, 24, 27, 0.6)", // Zinc 900 with opacity
    glassOverlay: "rgba(24, 24, 27, 0.4)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    
    // Status colors
    completed: "#34D399",
    completedLight: "#064E3B",
    inProgress: saffronLight,
    inProgressLight: "#451A03",
    notStarted: zinc[600],
    notStartedLight: zinc[900],
    
    // Spiritual Accents
    kumkum: "#EF4444",
    gold: goldenAccent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Merriweather, Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  base: 12,
  md: 16, // Increased base spacing for cleaner layout
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18, // Slightly larger base
    lg: 20,
    xl: 24,
    "2xl": 30,
    "3xl": 36,
    "4xl": 48,
    "5xl": 60,
  },
  weight: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

export const Shadows = {
  glow: {
    shadowColor: saffronOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  sm: {
    shadowColor: zinc[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: zinc[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: zinc[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  xl: {
    shadowColor: zinc[900],
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 20,
  },
  // Inner shadow simulation for pressed states
  inner: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
};

export const Layout = {
  screenPadding: Spacing.xl,
  maxWidth: 1200,
  tabBarHeight: 64,
  headerHeight: 64,
};
