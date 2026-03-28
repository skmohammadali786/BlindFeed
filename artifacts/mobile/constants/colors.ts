export const DarkColors = {
  background: "#000000",
  surface: "#1C1C1E",
  surfaceElevated: "#2C2C2E",
  border: "#2C2C2E",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  textTertiary: "#48484A",
  green: "#3DDB85",
  greenDim: "rgba(61, 219, 133, 0.15)",
  buttonBg: "#2C2C2E",
  buttonBorder: "#3A3A3C",
  inputBg: "#1C1C1E",
  cardBg: "#1C1C1E",
  tabBar: "#111111",
};

export const LightColors = {
  background: "#F2F2F7",
  surface: "#FFFFFF",
  surfaceElevated: "#E5E5EA",
  border: "#D1D1D6",
  text: "#000000",
  textSecondary: "#636366",
  textTertiary: "#AEAEB2",
  green: "#25A265",
  greenDim: "rgba(37, 162, 101, 0.12)",
  buttonBg: "#E5E5EA",
  buttonBorder: "#D1D1D6",
  inputBg: "#FFFFFF",
  cardBg: "#FFFFFF",
  tabBar: "#FFFFFF",
};

export type ColorScheme = typeof DarkColors;

const Colors = DarkColors;
export default Colors;
