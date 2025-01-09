/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#FFA000"; // Darker Yellow
const tintColorDark = "#FFB300"; // Darker Yellow for dark mode

export const Colors = {
  light: {
    text: "#2D3436", // Dark Slate
    background: "#FFFFFF",
    tint: tintColorLight,
    icon: "#636E72", // Cool Gray
    tabIconDefault: "#B2BEC3", // Light Gray
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#F5F6FA", // Off White
    background: "#2D3436", // Dark Slate
    tint: tintColorDark,
    icon: "#DFE6E9", // Light Gray
    tabIconDefault: "#636E72", // Cool Gray
    tabIconSelected: tintColorDark,
  },
  primary: "#FFA000", // Darker Yellow
  secondary: "#9B6DFF", // Bright Purple
  accent: "#4CD964", // Fresh Green

  // Card background colors
  cards: {
    yellow: "#FFA000", // Darker Yellow for Training Program card
    purple: "#9B6DFF", // Everyday Care card
    green: "#4CD964", // Walking card
  },

  // Training levels with the new palette
  difficulty: {
    beginner: "#4CD964", // Fresh Green
    intermediate: "#FFA000", // Darker Yellow
    advanced: "#FF3B30", // Bright Red
  },

  // Semantic colors matching the new palette
  success: "#4CD964", // Fresh Green
  warning: "#FFA000", // Darker Yellow
  error: "#FF3B30", // Bright Red
  info: "#9B6DFF", // Bright Purple

  // Warm neutrals
  neutral: {
    50: "#FFFFFF",
    100: "#F7F7F7",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },

  // UI elements
  surface: "#FFFFFF",
  surfaceHover: "#F7F7F7",
  divider: "#EEEEEE",

  // Special features
  illustration: {
    background: "#FFB237", // Yellow card background
    accent: "#9B6DFF", // Purple elements
    highlight: "#4CD964", // Green accents
  },
};
